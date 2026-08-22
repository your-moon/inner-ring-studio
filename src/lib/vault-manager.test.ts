/** @jest-environment node */
import { execFileSync } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  addVault,
  forgetVault,
  listVaults,
  switchVault,
} from "./vault-manager";

describe("vault manager", () => {
  let root: string;
  const saved = {
    root: process.env.PMSQL_CONFIG_ROOT,
    vault: process.env.PMSQL_VAULT,
    dir: process.env.PMSQL_CONFIG_DIR,
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pmsql-mgr-"));
    process.env.PMSQL_CONFIG_ROOT = root;
    delete process.env.PMSQL_VAULT;
    delete process.env.PMSQL_CONFIG_DIR;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    for (const [k, v] of [
      ["PMSQL_CONFIG_ROOT", saved.root],
      ["PMSQL_VAULT", saved.vault],
      ["PMSQL_CONFIG_DIR", saved.dir],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test("starts with a single active default vault", () => {
    const vaults = listVaults();
    expect(vaults).toHaveLength(1);
    expect(vaults[0]).toMatchObject({ id: "default", active: true });
  });

  test("create adds a vault without switching to it", () => {
    const { entry } = addVault({ name: "Team", mode: "create" });
    const vaults = listVaults();
    expect(vaults.map((v) => v.name)).toEqual(["Default", "Team"]);
    expect(vaults.find((v) => v.id === entry.id)?.dir).toBe(join(root, entry.id));
    expect(vaults.find((v) => v.active)?.id).toBe("default"); // unchanged
  });

  test("switch changes the active vault", () => {
    const { entry } = addVault({ name: "Team", mode: "create" });
    expect(switchVault(entry.id)).toEqual({ active: entry.id });
    expect(listVaults().find((v) => v.active)?.id).toBe(entry.id);
  });

  test("duplicate names are rejected", () => {
    addVault({ name: "Team", mode: "create" });
    expect(() => addVault({ name: "team", mode: "create" })).toThrow(/already exists/i);
  });

  test("link requires a url", () => {
    expect(() => addVault({ name: "X", mode: "link" })).toThrow(/repo URL/i);
  });

  test("link clones an existing (empty) remote into a fresh git dir", () => {
    const remote = join(root, "remote.git");
    execFileSync("git", ["init", "--bare", "-q", remote]);

    const { entry } = addVault({ name: "Linked", mode: "link", url: remote });
    expect(entry.repoUrl).toBe(remote);
    expect(existsSync(join(entry.dir, ".git"))).toBe(true);

    const origin = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: entry.dir,
      encoding: "utf8",
    }).trim();
    expect(origin).toBe(remote);
  });

  test("forget unregisters but leaves files on disk", () => {
    const { entry } = addVault({ name: "Team", mode: "create" });
    // give it an on-disk footprint
    execFileSync("git", ["init", "-q", entry.dir]);
    expect(forgetVault(entry.id)).toEqual({ active: "default" });
    expect(listVaults().some((v) => v.id === entry.id)).toBe(false);
    expect(existsSync(entry.dir)).toBe(true); // files preserved
  });

  test("cannot forget the only vault", () => {
    expect(() => forgetVault("default")).toThrow(/only vault/i);
  });
});
