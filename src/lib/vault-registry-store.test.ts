/** @jest-environment node */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { addVault, setActive } from "./vault-registry";
import {
  activeVaultDir,
  configRoot,
  defaultRegistry,
  loadRegistry,
  registryPath,
  saveRegistry,
} from "./vault-registry-store";

describe("vault registry store", () => {
  let root: string;
  const savedRoot = process.env.PMSQL_CONFIG_ROOT;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pmsql-reg-"));
    process.env.PMSQL_CONFIG_ROOT = root;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (savedRoot === undefined) delete process.env.PMSQL_CONFIG_ROOT;
    else process.env.PMSQL_CONFIG_ROOT = savedRoot;
  });

  test("configRoot / registryPath honour PMSQL_CONFIG_ROOT", () => {
    expect(configRoot()).toBe(root);
    expect(registryPath()).toBe(join(root, "vaults.json"));
  });

  test("no file yet -> implicit default registry in the config root", () => {
    const reg = loadRegistry();
    expect(reg).toEqual(defaultRegistry());
    expect(reg.vaults).toHaveLength(1);
    expect(reg.vaults[0]).toMatchObject({ id: "default", dir: root });
    // ...and the default vault sits directly at <root>/vault.enc (today's layout)
    expect(activeVaultDir()).toBe(root);
  });

  test("save then load round-trips", () => {
    let reg = defaultRegistry();
    reg = addVault(reg, { id: "team", name: "Team", dir: join(root, "team") });
    reg = setActive(reg, "team");
    saveRegistry(reg);

    expect(loadRegistry()).toEqual(reg);
    expect(activeVaultDir()).toBe(join(root, "team"));
    // pretty-printed with a trailing newline
    expect(readFileSync(registryPath(), "utf8").endsWith("}\n")).toBe(true);
  });

  test("malformed vaults.json falls back to the default (never bricks)", () => {
    saveRegistry(defaultRegistry());
    writeFileSync(registryPath(), "{ not valid json");
    expect(loadRegistry()).toEqual(defaultRegistry());
  });

  test("a structurally-wrong registry (empty vaults) falls back too", () => {
    writeFileSync(registryPath(), JSON.stringify({ active: "x", vaults: [] }));
    expect(loadRegistry()).toEqual(defaultRegistry());
  });

  test("active pointing nowhere resolves to the first vault's dir", () => {
    let reg = defaultRegistry();
    reg = addVault(reg, { id: "b", name: "B", dir: join(root, "b") });
    reg = { ...reg, active: "ghost" };
    saveRegistry(reg);
    expect(activeVaultDir()).toBe(root); // first entry ("default")
  });
});
