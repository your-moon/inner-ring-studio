/** @jest-environment node
 *
 * Unit tests for cloudVaultPorts/syncCloudVaultNow against a mocked
 * `fetch` -- the HTTP-backed sibling of vault-sync.test.ts's fake-git-ports
 * tests. IS_LINKED (cloud-link.ts) is a module-load-time constant derived
 * from env vars, so each test sets env then `jest.resetModules()` + a fresh
 * `require` to pick it up, rather than importing at the top of the file.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

type CloudVaultSyncModule = typeof import("./cloud-vault-sync");

describe("cloud-vault-sync", () => {
  let dir: string;
  const savedEnv = {
    PMSQL_PASSPHRASE: process.env.PMSQL_PASSPHRASE,
    PMSQL_VAULT: process.env.PMSQL_VAULT,
    IRS_CLOUD_LINK: process.env.IRS_CLOUD_LINK,
    DEPLOY_MODE: process.env.DEPLOY_MODE,
    IRS_CLOUD_SESSION_FILE: process.env.IRS_CLOUD_SESSION_FILE,
  };
  let fetchMock: jest.Mock;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pmsql-cloud-vault-sync-"));
    process.env.PMSQL_PASSPHRASE = "test-pass";
    process.env.PMSQL_VAULT = join(dir, "vault.enc");
    process.env.IRS_CLOUD_LINK = "https://cloud.example.test";
    process.env.DEPLOY_MODE = "selfhosted";
    process.env.IRS_CLOUD_SESSION_FILE = join(dir, "cloud-session.json");
    writeFileSync(
      process.env.IRS_CLOUD_SESSION_FILE,
      JSON.stringify({ cookie: "irs_session=abc", email: "a@b.com" })
    );
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.resetModules();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    global.fetch = originalFetch;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function freshModule(): CloudVaultSyncModule {
    return require("./cloud-vault-sync") as CloudVaultSyncModule;
  }

  const jsonResponse = (body: unknown, ok = true) => ({
    ok,
    json: async () => body,
  });

  test("pulls a remote connection into the empty local vault", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          connections: [
            {
              id: "r1",
              name: "zahii-prod",
              driver: "postgres",
              host: "h",
              port: 5432,
              createdAt: 1,
              updatedAt: 1,
            },
          ],
          tombstones: [],
          version: 3,
        })
      ) // GET
      .mockResolvedValueOnce(jsonResponse({ version: 4 })); // POST

    const { syncCloudVaultNow } = freshModule();
    const r = await syncCloudVaultNow();
    expect(r.ok).toBe(true);

    const { readVault } = require("./vault") as typeof import("./vault");
    expect(readVault().connections.map((c) => c.name)).toEqual(["zahii-prod"]);

    // The POST carried the merged (here: just the pulled-in) connection back,
    // with the version the GET returned.
    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toBe("https://cloud.example.test/api/workspace/connections/raw");
    const postBody = JSON.parse(postCall[1].body);
    expect(postBody.expectedVersion).toBe(3);
    expect(postBody.connections.map((c: { name: string }) => c.name)).toEqual([
      "zahii-prod",
    ]);
  });

  test("sends the session cookie on every request", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ connections: [], tombstones: [], version: 0 }))
      .mockResolvedValueOnce(jsonResponse({ version: 1 }));

    const { syncCloudVaultNow } = freshModule();
    await syncCloudVaultNow();

    for (const call of fetchMock.mock.calls) {
      expect(call[1].headers.Cookie).toBe("irs_session=abc");
    }
  });

  test("is a no-op when not linked to a cloud account", async () => {
    delete process.env.IRS_CLOUD_LINK;
    jest.resetModules();
    const { syncCloudVaultNow } = freshModule();

    const r = await syncCloudVaultNow();
    expect(r).toEqual({ ok: false, message: "not linked to a cloud account" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("is a no-op when linked but not signed in", async () => {
    rmSync(process.env.IRS_CLOUD_SESSION_FILE!, { force: true });
    jest.resetModules();
    const { syncCloudVaultNow } = freshModule();

    const r = await syncCloudVaultNow();
    expect(r).toEqual({ ok: false, message: "not signed in" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("reports failure when the cloud is unreachable, without throwing", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const { syncCloudVaultNow } = freshModule();

    const r = await syncCloudVaultNow();
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/push failed/);
  });
});
