import {
  authEnabled,
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from "./auth";

/**
 * The session layer is the only thing between the public internet and every
 * data route on the hosted instance. A forged or replayed token must never
 * verify.
 */
describe("auth", () => {
  afterEach(() => {
    delete process.env.PMSQL_AUTH_PASSWORD;
  });

  describe("verifyPassword", () => {
    it("accepts the exact password", () => {
      process.env.PMSQL_AUTH_PASSWORD = "Likeofman@12";
      expect(verifyPassword("Likeofman@12")).toBe(true);
    });

    it("rejects a wrong password and a length-mismatch", () => {
      process.env.PMSQL_AUTH_PASSWORD = "Likeofman@12";
      expect(verifyPassword("Likeofman@13")).toBe(false);
      expect(verifyPassword("short")).toBe(false);
      expect(verifyPassword("")).toBe(false);
    });

    it("rejects everything when no password is configured", () => {
      expect(verifyPassword("")).toBe(false);
      expect(verifyPassword("anything")).toBe(false);
    });
  });

  describe("authEnabled", () => {
    it("tracks whether PMSQL_AUTH_PASSWORD is set", () => {
      expect(authEnabled()).toBe(false);
      process.env.PMSQL_AUTH_PASSWORD = "x";
      expect(authEnabled()).toBe(true);
    });
  });

  describe("session tokens", () => {
    beforeEach(() => {
      process.env.PMSQL_AUTH_PASSWORD = "Likeofman@12";
    });

    it("verifies a freshly minted token", async () => {
      const token = await createSessionToken();
      expect(await verifySessionToken(token)).toBe(true);
    });

    it("rejects a tampered signature", async () => {
      const token = await createSessionToken();
      const [payload] = token.split(".");
      expect(await verifySessionToken(`${payload}.deadbeef`)).toBe(false);
    });

    it("rejects a tampered payload", async () => {
      const token = await createSessionToken();
      const [, sig] = token.split(".");
      const forged = Buffer.from(
        JSON.stringify({ exp: Date.now() + 1e12 })
      ).toString("base64url");
      expect(await verifySessionToken(`${forged}.${sig}`)).toBe(false);
    });

    it("rejects malformed and empty tokens", async () => {
      expect(await verifySessionToken(undefined)).toBe(false);
      expect(await verifySessionToken("")).toBe(false);
      expect(await verifySessionToken("nodot")).toBe(false);
    });

    it("rejects a token signed under a different password (rotation)", async () => {
      const token = await createSessionToken();
      process.env.PMSQL_AUTH_PASSWORD = "a-new-password";
      expect(await verifySessionToken(token)).toBe(false);
    });
  });
});
