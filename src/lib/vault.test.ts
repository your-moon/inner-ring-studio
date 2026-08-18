import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  addConnection,
  getConnection,
  listConnections,
  readVault,
  removeConnection,
  updateConnection,
} from "./vault";

/**
 * The vault is the credential store: everything below is a security-critical
 * invariant, not a convenience. A regression here leaks DB passwords or bricks
 * multi-device sync.
 */
describe("vault", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pmsql-vault-"));
    process.env.PMSQL_VAULT = join(dir, "vault.enc");
    process.env.PMSQL_PASSPHRASE = "correct horse battery staple";
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.PMSQL_VAULT;
    delete process.env.PMSQL_PASSPHRASE;
  });

  const sample = {
    name: "prod",
    driver: "postgres" as const,
    host: "db.example.com",
    port: 5432,
    database: "app",
    user: "reader",
    password: "s3cr3t-p@ss",
    ssl: true,
    readOnly: true,
  };

  it("round-trips an encrypted connection incl. the password", () => {
    const added = addConnection(sample);
    const back = getConnection(added.id);
    expect(back?.password).toBe("s3cr3t-p@ss");
    expect(back?.host).toBe("db.example.com");
    expect(back?.readOnly).toBe(true);
  });

  it("never returns passwords from listConnections", () => {
    addConnection(sample);
    const list = listConnections();
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("password");
    expect(JSON.stringify(list)).not.toContain("s3cr3t-p@ss");
  });

  it("fails to decrypt with the wrong passphrase", () => {
    addConnection(sample);
    process.env.PMSQL_PASSPHRASE = "wrong passphrase";
    expect(() => readVault()).toThrow(/wrong PMSQL_PASSPHRASE|decrypt/i);
  });

  it("throws when the passphrase is missing", () => {
    addConnection(sample);
    delete process.env.PMSQL_PASSPHRASE;
    expect(() => readVault()).toThrow(/PMSQL_PASSPHRASE/);
  });

  it("keeps the existing password when update omits it", () => {
    const added = addConnection(sample);
    updateConnection(added.id, { host: "new.example.com" });
    const back = getConnection(added.id);
    expect(back?.host).toBe("new.example.com");
    expect(back?.password).toBe("s3cr3t-p@ss"); // unchanged
  });

  it("keeps the existing password when update passes an empty string", () => {
    const added = addConnection(sample);
    updateConnection(added.id, { password: "" });
    expect(getConnection(added.id)?.password).toBe("s3cr3t-p@ss");
  });

  it("replaces the password when update provides a new one", () => {
    const added = addConnection(sample);
    updateConnection(added.id, { password: "rotated" });
    expect(getConnection(added.id)?.password).toBe("rotated");
  });

  it("rejects a duplicate connection name", () => {
    addConnection(sample);
    expect(() => addConnection(sample)).toThrow(/already exists/);
  });

  it("removes by id and by name", () => {
    const a = addConnection({ ...sample, name: "a" });
    addConnection({ ...sample, name: "b" });
    expect(removeConnection(a.id)).toBe(true);
    expect(removeConnection("b")).toBe(true);
    expect(removeConnection("missing")).toBe(false);
    expect(listConnections()).toHaveLength(0);
  });
});
