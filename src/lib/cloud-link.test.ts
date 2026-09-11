/** @jest-environment node
 *
 * Regression test for a real bug found live: getCloudSession() only checked
 * that the session file existed, never that the token inside it was still
 * valid -- so a session that expired two weeks ago still reported
 * signedIn:true, and every real sync attempt failed with a silent 401.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function b64url(json: unknown): string {
  return Buffer.from(JSON.stringify(json)).toString("base64url");
}

describe("getCloudSession", () => {
  let dir: string;
  const savedFile = process.env.IRS_CLOUD_SESSION_FILE;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pmsql-cloud-link-"));
    process.env.IRS_CLOUD_SESSION_FILE = join(dir, "cloud-session.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (savedFile === undefined) delete process.env.IRS_CLOUD_SESSION_FILE;
    else process.env.IRS_CLOUD_SESSION_FILE = savedFile;
  });

  function write(cookie: string) {
    writeFileSync(
      process.env.IRS_CLOUD_SESSION_FILE!,
      JSON.stringify({ cookie, email: "a@b.com" })
    );
  }

  test("returns the session when the token's exp is in the future", () => {
    jest.resetModules();
    const { getCloudSession } = require("./cloud-link") as typeof import("./cloud-link");
    const payload = b64url({ userId: "u1", exp: Date.now() + 60_000 });
    write(`irs_session=${payload}.fakesig`);

    expect(getCloudSession()).toEqual({
      cookie: `irs_session=${payload}.fakesig`,
      email: "a@b.com",
    });
  });

  test("returns null when the token's exp has already passed", () => {
    jest.resetModules();
    const { getCloudSession } = require("./cloud-link") as typeof import("./cloud-link");
    const payload = b64url({ userId: "u1", exp: Date.now() - 60_000 });
    write(`irs_session=${payload}.fakesig`);

    expect(getCloudSession()).toBeNull();
  });

  test("returns null when there is no session file at all", () => {
    jest.resetModules();
    const { getCloudSession } = require("./cloud-link") as typeof import("./cloud-link");
    expect(getCloudSession()).toBeNull();
  });
});
