/** @jest-environment node
 *
 * Real-git regression test for the vault-sync engine's `defaultVaultPorts`
 * wiring (as opposed to vault-sync.test.ts, which only exercises the pure
 * `syncVault` orchestration against fake in-memory ports). This is the layer
 * that actually shells out to git, and it hid a bug the fake-ports tests
 * structurally cannot see: `fetch` only moves the `origin/<branch>`
 * tracking ref, never local HEAD, so a merge commit made without first
 * landing on the fetched tip is never a fast-forward descendant of origin —
 * `push` was rejected every time two devices had each written since the
 * last sync, which is the whole scenario this engine exists to handle.
 */
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { syncVaultNow } from "./vault-sync";
import { linkRepo } from "./config-repo";
import { addConnection, removeConnection, readVault } from "./vault";

function git(args: string[], cwd: string) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

/** Run `fn` with the vault env vars pointed at `dir`, restoring them after. */
async function asDevice<T>(dir: string, fn: () => T | Promise<T>): Promise<T> {
  const prevConfig = process.env.PMSQL_CONFIG_DIR;
  const prevVault = process.env.PMSQL_VAULT;
  process.env.PMSQL_CONFIG_DIR = dir;
  process.env.PMSQL_VAULT = join(dir, "vault.enc");
  try {
    return await fn();
  } finally {
    if (prevConfig === undefined) delete process.env.PMSQL_CONFIG_DIR;
    else process.env.PMSQL_CONFIG_DIR = prevConfig;
    if (prevVault === undefined) delete process.env.PMSQL_VAULT;
    else process.env.PMSQL_VAULT = prevVault;
  }
}

describe("vault-sync real-git integration", () => {
  let root: string;
  let bare: string;
  let devA: string;
  let devB: string;
  const prevPassphrase = process.env.PMSQL_PASSPHRASE;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pmsql-vault-sync-"));
    bare = join(root, "bare.git");
    devA = join(root, "deviceA");
    devB = join(root, "deviceB");
    execFileSync("git", ["init", "-q", "--bare", bare]);
    process.env.PMSQL_PASSPHRASE = "test-passphrase";
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (prevPassphrase === undefined) delete process.env.PMSQL_PASSPHRASE;
    else process.env.PMSQL_PASSPHRASE = prevPassphrase;
  });

  test("one device's delete and another device's concurrent add both land on both sides", async () => {
    // A: seed a connection, link, push.
    await asDevice(devA, async () => {
      addConnection({ name: "zahii-prod", driver: "postgres", host: "h", port: 5432 });
      linkRepo(`file://${bare}`);
      const r = await syncVaultNow();
      expect(r.ok).toBe(true);
    });

    // B: link (pulls A's existing vault).
    await asDevice(devB, () => {
      linkRepo(`file://${bare}`);
      expect(readVault().connections.map((c) => c.name)).toEqual(["zahii-prod"]);
    });

    // B: delete it, sync (push the delete).
    await asDevice(devB, async () => {
      removeConnection("zahii-prod");
      const r = await syncVaultNow();
      expect(r.ok).toBe(true);
    });

    // A: WITHOUT pulling B's delete, independently add a different connection.
    await asDevice(devA, () => {
      addConnection({ name: "powerbank", driver: "postgres", host: "h2", port: 5432 });
    });

    // A: sync now has to reconcile a real divergence — this is exactly the
    // case that used to fail with "push failed after 3 attempts".
    await asDevice(devA, async () => {
      const r = await syncVaultNow();
      expect(r.ok).toBe(true);
      const names = readVault().connections.map((c) => c.name).sort();
      expect(names).toEqual(["powerbank"]); // zahii-prod's deletion applied here too
    });

    // B: syncing again must pick up A's addition.
    await asDevice(devB, async () => {
      const r = await syncVaultNow();
      expect(r.ok).toBe(true);
      const names = readVault().connections.map((c) => c.name).sort();
      expect(names).toEqual(["powerbank"]);
    });
  });
});
