/** @jest-environment node */
import {
  activeEntry,
  addVault,
  removeVault,
  renameVault,
  setActive,
  type VaultRegistry,
} from "./vault-registry";

const entry = (id: string, name = id) => ({ id, name, dir: `/d/${id}` });
const reg = (): VaultRegistry => ({
  active: "a",
  vaults: [entry("a", "Personal"), entry("b", "Team")],
});

describe("vault registry", () => {
  test("addVault appends and leaves active unchanged", () => {
    const r = addVault(reg(), entry("c", "Client"));
    expect(r.vaults.map((v) => v.id)).toEqual(["a", "b", "c"]);
    expect(r.active).toBe("a");
  });

  test("addVault rejects a duplicate id or name (case-insensitive)", () => {
    expect(() => addVault(reg(), entry("a", "X"))).toThrow(/id/);
    expect(() => addVault(reg(), entry("z", "team"))).toThrow(/already exists/);
  });

  test("setActive switches, and rejects an unknown id", () => {
    expect(setActive(reg(), "b").active).toBe("b");
    expect(() => setActive(reg(), "nope")).toThrow(/Unknown/);
  });

  test("removeVault drops a vault and reassigns active if it was removed", () => {
    const r = removeVault(reg(), "a"); // 'a' was active
    expect(r.vaults.map((v) => v.id)).toEqual(["b"]);
    expect(r.active).toBe("b");
  });

  test("removeVault keeps active when a different vault is removed", () => {
    const r = removeVault(reg(), "b");
    expect(r.active).toBe("a");
  });

  test("removeVault refuses to remove the last vault", () => {
    const one: VaultRegistry = { active: "a", vaults: [entry("a")] };
    expect(() => removeVault(one, "a")).toThrow(/only vault/);
  });

  test("renameVault renames and rejects a colliding name", () => {
    expect(renameVault(reg(), "a", "Personal 2").vaults[0].name).toBe("Personal 2");
    expect(() => renameVault(reg(), "a", "Team")).toThrow(/already exists/);
    // renaming to its own name is fine
    expect(renameVault(reg(), "a", "Personal").vaults[0].name).toBe("Personal");
  });

  test("activeEntry returns the active vault, falling back to the first", () => {
    expect(activeEntry(reg())!.id).toBe("a");
    expect(activeEntry({ active: "gone", vaults: reg().vaults })!.id).toBe("a");
  });
});
