/** @jest-environment node
 *
 * Real end-to-end test: a real local vault dir + real Postgres (same
 * throwaway DB cloud-db.test.ts uses), wired together the way the actual
 * route would -- `global.fetch` is stubbed to call straight into
 * cloud-db.ts's real functions instead of going over the network, but every
 * layer underneath (mergeVaults, the DB transaction, the vault file) is the
 * real thing. Proves the exact scenario the design doc calls out: a local
 * vault carrying an old tombstone correctly deletes a cloud row that's been
 * sitting untouched since before the tombstone existed -- the "first sync
 * cleans up stale cloud rows" behavior. Skips if Postgres isn't reachable.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { _resetKeyCache } from "./crypto";
import {
  _closeCloudPool,
  applyWorkspaceConnectionsMerge,
  ensureSchema,
  getWorkspaceConnectionsRaw,
} from "./cloud-db";
import { createUser } from "./cloud-users";
import { personalWorkspaceId } from "./workspaces";

process.env.IRS_CLOUD_DB_URL =
  process.env.IRS_CLOUD_DB_URL ?? "postgres://shop:shop@localhost:5434/shop";
process.env.IRS_CLOUD_KEY = "test-cloud-master-key";

let reachable = false;
const suffix = Math.random().toString(36).slice(2, 8);

beforeAll(async () => {
  _resetKeyCache();
  try {
    await ensureSchema();
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  await _closeCloudPool();
});

const maybe = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!reachable) return console.warn("cloud DB unreachable — skipping:", name);
    await fn();
  });

describe("cloud-vault-sync real end-to-end", () => {
  maybe(
    "a local tombstone from before the cloud row was last touched deletes it on first sync",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pmsql-cloud-vault-e2e-"));
      const savedVault = process.env.PMSQL_VAULT;
      const savedPassphrase = process.env.PMSQL_PASSPHRASE;
      const savedLink = process.env.IRS_CLOUD_LINK;
      const savedMode = process.env.DEPLOY_MODE;
      const savedSessionFile = process.env.IRS_CLOUD_SESSION_FILE;

      try {
        process.env.PMSQL_VAULT = join(dir, "vault.enc");
        process.env.PMSQL_PASSPHRASE = "test-pass";
        process.env.IRS_CLOUD_LINK = "https://cloud.example.test";
        process.env.DEPLOY_MODE = "selfhosted";
        process.env.IRS_CLOUD_SESSION_FILE = join(dir, "cloud-session.json");
        writeFileSync(
          process.env.IRS_CLOUD_SESSION_FILE,
          JSON.stringify({ cookie: "irs_session=fake", email: "e2e@t.co" })
        );

        const user = await createUser(`e2e_${suffix}@t.co`, "password123");
        const workspaceId = (await personalWorkspaceId(user.id))!;

        // Seed the cloud side as it would have looked on 8/21: a connection
        // created long ago, never touched since.
        const longAgo = Date.parse("2026-08-21T00:00:00Z");
        await applyWorkspaceConnectionsMerge(workspaceId, user.id, {
          connections: [
            {
              id: "cloud-zahii-prod",
              name: "zahii-prod",
              driver: "postgres",
              host: "h",
              port: 5432,
              createdAt: longAgo,
              updatedAt: longAgo,
            },
          ],
          tombstones: [],
          expectedVersion: 0,
        });

        // The route this fetch mock stands in for always resolves the
        // caller's OWN personal workspace from their session -- it never
        // takes a workspace id from the request. Emulate that here by
        // closing over `workspaceId`/`user.id` rather than parsing them out
        // of the (fake) request.
        jest.resetModules();
        (global as unknown as { fetch: jest.Mock }).fetch = jest.fn(
          async (url: string, init?: RequestInit) => {
            if (init?.method === "GET" || !init?.method) {
              const raw = await getWorkspaceConnectionsRaw(workspaceId);
              return { ok: true, json: async () => raw };
            }
            const body = JSON.parse(init.body as string);
            const result = await applyWorkspaceConnectionsMerge(workspaceId, user.id, body);
            return { ok: result.ok, json: async () => result };
          }
        );

        const { addConnection, removeConnection, readVault } =
          require("./vault") as typeof import("./vault");
        const { syncCloudVaultNow } =
          require("./cloud-vault-sync") as typeof import("./cloud-vault-sync");

        // Local vault: create the SAME connection (matching id, as if this
        // device had it from an earlier sync) then delete it on 8/28 --
        // provably later than the cloud row's untouched-since-8/21 updatedAt.
        addConnection({ name: "zahii-prod", driver: "postgres", host: "h", port: 5432 });
        // Force the id + backdate the delete to a specific, known instant
        // rather than relying on "now" being later than a hardcoded 8/21.
        const data = readVault();
        data.connections[0].id = "cloud-zahii-prod";
        data.connections[0].updatedAt = longAgo;
        require("./vault").writeVault(data);
        removeConnection("cloud-zahii-prod");
        const deletedAt = Date.parse("2026-08-28T00:00:00Z");
        const afterDelete = readVault();
        afterDelete.tombstones![0].deletedAt = deletedAt;
        require("./vault").writeVault(afterDelete);

        const r = await syncCloudVaultNow();
        expect(r.ok).toBe(true);

        // The stale cloud row is gone -- the local tombstone won.
        const cloudAfter = await getWorkspaceConnectionsRaw(workspaceId);
        expect(cloudAfter.connections).toHaveLength(0);
        expect(cloudAfter.tombstones.map((t) => t.id)).toContain("cloud-zahii-prod");

        // And the local vault agrees: no connections either.
        expect(readVault().connections).toHaveLength(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
        if (savedVault === undefined) delete process.env.PMSQL_VAULT;
        else process.env.PMSQL_VAULT = savedVault;
        if (savedPassphrase === undefined) delete process.env.PMSQL_PASSPHRASE;
        else process.env.PMSQL_PASSPHRASE = savedPassphrase;
        if (savedLink === undefined) delete process.env.IRS_CLOUD_LINK;
        else process.env.IRS_CLOUD_LINK = savedLink;
        if (savedMode === undefined) delete process.env.DEPLOY_MODE;
        else process.env.DEPLOY_MODE = savedMode;
        if (savedSessionFile === undefined) delete process.env.IRS_CLOUD_SESSION_FILE;
        else process.env.IRS_CLOUD_SESSION_FILE = savedSessionFile;
      }
    }
  );
});
