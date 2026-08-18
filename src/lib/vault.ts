import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

/**
 * pmsql encrypted connection vault.
 *
 * A single file (default `~/.config/pmsql/vault.enc`) holding all connection
 * records — including passwords — encrypted at rest with AES-256-GCM under a key
 * derived from a master passphrase (scrypt). The file is portable: sync it
 * across devices (git/scp/Dropbox); it is useless without the passphrase.
 *
 * The passphrase is supplied via the PMSQL_PASSPHRASE environment variable, so
 * both the CLI and the running server can open the vault non-interactively.
 */

export interface VaultConnection {
  id: string;
  name: string;
  driver: "postgres";
  host: string;
  port: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  createdAt: number;
}

/** A connection with its secret stripped — safe to send to the browser. */
export type SafeConnection = Omit<VaultConnection, "password">;

interface VaultFile {
  version: 1;
  salt: string; // hex
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // base64
}

interface VaultData {
  connections: VaultConnection[];
}

export function vaultPath(): string {
  return (
    process.env.PMSQL_VAULT ??
    join(homedir(), ".config", "pmsql", "vault.enc")
  );
}

function getPassphrase(): string {
  const p = process.env.PMSQL_PASSPHRASE;
  if (!p) {
    throw new Error(
      "PMSQL_PASSPHRASE is not set. Set it to the master passphrase that " +
        "encrypts the vault, e.g. `export PMSQL_PASSPHRASE=...`"
    );
  }
  return p;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  // scrypt: N=16384 is a sensible interactive cost.
  return scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 });
}

export function readVault(): VaultData {
  const path = vaultPath();
  if (!existsSync(path)) return { connections: [] };

  const file: VaultFile = JSON.parse(readFileSync(path, "utf8"));
  const key = deriveKey(getPassphrase(), Buffer.from(file.salt, "hex"));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(file.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(file.tag, "hex"));
  let plaintext: string;
  try {
    plaintext =
      decipher.update(file.ciphertext, "base64", "utf8") +
      decipher.final("utf8");
  } catch {
    throw new Error(
      "Failed to decrypt vault — wrong PMSQL_PASSPHRASE or corrupted file."
    );
  }
  return JSON.parse(plaintext) as VaultData;
}

export function writeVault(data: VaultData): void {
  const path = vaultPath();
  mkdirSync(dirname(path), { recursive: true });

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(getPassphrase(), salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext =
    cipher.update(JSON.stringify(data), "utf8", "base64") +
    cipher.final("base64");
  const tag = cipher.getAuthTag();

  const file: VaultFile = {
    version: 1,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext,
  };
  writeFileSync(path, JSON.stringify(file, null, 2), { mode: 0o600 });
}

// --------------------------- CRUD helpers ---------------------------

function newId(): string {
  return randomBytes(8).toString("hex");
}

export function listConnections(): SafeConnection[] {
  return readVault().connections.map(({ password: _pw, ...safe }) => safe);
}

export function getConnection(id: string): VaultConnection | undefined {
  return readVault().connections.find((c) => c.id === id);
}

export function addConnection(
  conn: Omit<VaultConnection, "id" | "createdAt">
): SafeConnection {
  const data = readVault();
  if (data.connections.some((c) => c.name === conn.name)) {
    throw new Error(`A connection named "${conn.name}" already exists.`);
  }
  const record: VaultConnection = {
    ...conn,
    id: newId(),
    createdAt: Date.now(),
  };
  data.connections.push(record);
  writeVault(data);
  const { password: _pw, ...safe } = record;
  return safe;
}

export function updateConnection(
  id: string,
  patch: Partial<Omit<VaultConnection, "id" | "createdAt">>
): SafeConnection | null {
  const data = readVault();
  const conn = data.connections.find((c) => c.id === id);
  if (!conn) return null;
  // Only overwrite fields that were provided; an omitted password is kept.
  for (const key of [
    "name",
    "host",
    "port",
    "database",
    "user",
    "ssl",
  ] as const) {
    if (patch[key] !== undefined) (conn[key] as unknown) = patch[key];
  }
  if (patch.password !== undefined && patch.password !== "") {
    conn.password = patch.password;
  }
  writeVault(data);
  const { password: _pw, ...safe } = conn;
  return safe;
}

export function removeConnection(nameOrId: string): boolean {
  const data = readVault();
  const before = data.connections.length;
  data.connections = data.connections.filter(
    (c) => c.name !== nameOrId && c.id !== nameOrId
  );
  if (data.connections.length === before) return false;
  writeVault(data);
  return true;
}
