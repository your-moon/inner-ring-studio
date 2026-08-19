import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

/**
 * String encryption for cloud-mode connection passwords.
 *
 * AES-256-GCM under a key derived once (scrypt) from the server master key
 * `IRS_CLOUD_KEY`. Unlike the vault (which encrypts one blob per write and can
 * afford a per-write scrypt), cloud passwords are decrypted on *every* query, so
 * the derived key is cached and each value carries only a random IV — no per-row
 * scrypt on the hot path. Token format: `iv.tag.ciphertext` (base64url).
 *
 * Same tradeoff as the vault: a server compromise plus the master key exposes
 * stored DB passwords. The key lives only in the process env (chmod-600).
 */

let cachedKey: Buffer | null = null;

function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.IRS_CLOUD_KEY;
  if (!secret) {
    throw new Error(
      "IRS_CLOUD_KEY is not set — required to encrypt cloud connection passwords."
    );
  }
  // Fixed salt is acceptable for a single high-entropy master key (scrypt's salt
  // guards against rainbow tables over low-entropy inputs; here it's one env key).
  cachedKey = scryptSync(secret, "inner-ring-studio.cloud.v1", 32, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ct].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(token: string): string {
  const [ivB, tagB, ctB] = token.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(ivB, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// Test-only: reset the cached key (e.g. after changing IRS_CLOUD_KEY in a test).
export function _resetKeyCache(): void {
  cachedKey = null;
}
