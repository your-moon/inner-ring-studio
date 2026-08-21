import { _resetKeyCache } from "./crypto";
import { CloudConnectionStore, _closeCloudPool, ensureSchema } from "./cloud-db";
import {
  authenticateUser,
  changePassword,
  createUser,
  deleteUser,
  getUserById,
} from "./cloud-users";
import type { AuthContext } from "./connection-store";
import { personalWorkspaceId } from "./workspaces";

/**
 * Integration test for cloud mode against a real Postgres (the seeded sample DB
 * at localhost:5434 doubles as a throwaway cloud DB here). Proves the property
 * the whole cloud model depends on: strict per-user isolation. Skips if the DB
 * isn't reachable (e.g. CI).
 */
process.env.IRS_CLOUD_DB_URL =
  process.env.IRS_CLOUD_DB_URL ?? "postgres://shop:shop@localhost:5434/shop";
process.env.IRS_CLOUD_KEY = "test-cloud-master-key";

let reachable = false;
const suffix = Math.random().toString(36).slice(2, 8);
const store = new CloudConnectionStore();

beforeAll(async () => {
  _resetKeyCache();
  try {
    await ensureSchema();
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  await _closeCloudPool();
});

const maybe = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!reachable) return console.warn("cloud DB unreachable — skipping:", name);
    await fn();
  });

// The cloud connection store is scoped to the active workspace; in the real app
// that's resolved from the session, here we use the user's personal workspace.
const ctxFor = async (userId: string): Promise<AuthContext> => ({
  userId,
  workspaceId: (await personalWorkspaceId(userId)) ?? undefined,
});

const sampleConn = {
  name: "prod",
  driver: "postgres" as const,
  host: "db.example.com",
  port: 5432,
  database: "app",
  user: "reader",
  password: "s3cr3t",
  ssl: true,
  readOnly: true,
};

describe("cloud-db accounts + isolation", () => {
  maybe("creates a user and authenticates", async () => {
    const email = `a_${suffix}@t.co`;
    const user = await createUser(email, "password123");
    expect(user.email).toBe(email);
    expect(await authenticateUser(email, "password123")).toMatchObject({
      id: user.id,
    });
    expect(await authenticateUser(email, "wrong")).toBeNull();
    expect(await authenticateUser(`missing_${suffix}@t.co`, "x")).toBeNull();
  });

  maybe("rejects a duplicate email", async () => {
    const email = `dup_${suffix}@t.co`;
    await createUser(email, "password123");
    await expect(createUser(email, "password123")).rejects.toThrow(/already exists/);
  });

  maybe("isolates connections per user (A cannot see or get B's)", async () => {
    const a = await createUser(`iso_a_${suffix}@t.co`, "password123");
    const b = await createUser(`iso_b_${suffix}@t.co`, "password123");
    const ctxA = await ctxFor(a.id);
    const ctxB = await ctxFor(b.id);

    const added = await store.add(ctxA, sampleConn);

    // A sees it (password stripped) and can resolve its password.
    const listA = await store.list(ctxA);
    expect(listA.map((c) => c.name)).toContain("prod");
    expect(listA[0]).not.toHaveProperty("password");
    expect((await store.get(ctxA, added.id))?.password).toBe("s3cr3t");

    // B sees nothing and cannot get A's connection by id.
    expect(await store.list(ctxB)).toHaveLength(0);
    expect(await store.get(ctxB, added.id)).toBeUndefined();
    // B cannot delete A's connection.
    expect(await store.remove(ctxB, added.id)).toBe(false);
    expect(await store.get(ctxA, added.id)).toBeDefined();
  });

  maybe("getUserById returns the account", async () => {
    const u = await createUser(`byid_${suffix}@t.co`, "password123");
    expect(await getUserById(u.id)).toMatchObject({ id: u.id, email: u.email });
    expect(await getUserById("nope")).toBeNull();
  });

  maybe("changePassword verifies the current password", async () => {
    const email = `cpw_${suffix}@t.co`;
    const u = await createUser(email, "oldpassword");
    expect(await changePassword(u.id, "wrong", "newpassword")).toBe(false);
    expect(await changePassword(u.id, "oldpassword", "newpassword")).toBe(true);
    expect(await authenticateUser(email, "oldpassword")).toBeNull();
    expect(await authenticateUser(email, "newpassword")).toMatchObject({ id: u.id });
  });

  maybe("deleteUser needs the password and cascades to connections", async () => {
    const u = await createUser(`del_${suffix}@t.co`, "password123");
    const ctx = await ctxFor(u.id);
    await store.add(ctx, sampleConn);
    expect(await deleteUser(u.id, "wrong")).toBe(false);
    expect(await deleteUser(u.id, "password123")).toBe(true);
    expect(await getUserById(u.id)).toBeNull();
    expect(await store.list(ctx)).toHaveLength(0); // connections cascade-deleted
  });

  maybe("update keeps the password when omitted, replaces when given", async () => {
    const u = await createUser(`upd_${suffix}@t.co`, "password123");
    const ctx = await ctxFor(u.id);
    const c = await store.add(ctx, sampleConn);
    await store.update(ctx, c.id, { host: "new.example.com" });
    expect((await store.get(ctx, c.id))?.password).toBe("s3cr3t"); // kept
    expect((await store.get(ctx, c.id))?.host).toBe("new.example.com");
    await store.update(ctx, c.id, { password: "rotated" });
    expect((await store.get(ctx, c.id))?.password).toBe("rotated");
  });
});
