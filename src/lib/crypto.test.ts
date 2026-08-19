import { _resetKeyCache, decryptSecret, encryptSecret } from "./crypto";

describe("cloud secret crypto", () => {
  beforeEach(() => {
    process.env.IRS_CLOUD_KEY = "test-master-key-please-change";
    _resetKeyCache();
  });
  afterEach(() => {
    delete process.env.IRS_CLOUD_KEY;
    _resetKeyCache();
  });

  it("round-trips a secret", () => {
    const enc = encryptSecret("s3cr3t-p@ss");
    expect(enc).not.toContain("s3cr3t");
    expect(decryptSecret(enc)).toBe("s3cr3t-p@ss");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("fails to decrypt a tampered token", () => {
    const enc = encryptSecret("hello");
    const [iv, tag, ct] = enc.split(".");
    expect(() => decryptSecret(`${iv}.${tag}.${ct}AAAA`)).toThrow();
  });

  it("fails to decrypt under a different master key", () => {
    const enc = encryptSecret("hello");
    process.env.IRS_CLOUD_KEY = "a-completely-different-key";
    _resetKeyCache();
    expect(() => decryptSecret(enc)).toThrow();
  });

  it("throws when no master key is configured", () => {
    delete process.env.IRS_CLOUD_KEY;
    _resetKeyCache();
    expect(() => encryptSecret("x")).toThrow(/IRS_CLOUD_KEY/);
  });
});
