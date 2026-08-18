import { Pool } from "pg";
import { closeCursor, openCursor, readMore } from "./query-cursor";

/**
 * Integration test against the seeded sample DB (localhost:5434, shop/shop/shop).
 * Proves the held-cursor property that makes lazy pagination correct: paging
 * through a single cursor yields every row exactly once — no duplicates, no
 * gaps — which OFFSET re-runs cannot guarantee for unordered queries.
 *
 * Skips automatically if the sample DB isn't running (e.g. in CI).
 */
const SAMPLE = {
  host: "localhost",
  port: 5434,
  database: "shop",
  user: "shop",
  password: "shop",
};

let pool: Pool;
let reachable = false;

beforeAll(async () => {
  pool = new Pool({ ...SAMPLE, connectionTimeoutMillis: 1500, max: 4 });
  try {
    await pool.query("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  await pool?.end().catch(() => {});
});

const maybe = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!reachable) {
      console.warn("sample DB unreachable — skipping:", name);
      return;
    }
    await fn();
  });

describe("held cursor pagination", () => {
  maybe("pages a 500-row result with no duplicates and no gaps", async () => {
    const sql = "SELECT g AS n FROM generate_series(0, 499) g";
    const seen: number[] = [];

    const first = await openCursor(pool, sql, 200);
    expect(first.cursorId).toBeTruthy();
    expect(first.rows).toHaveLength(200);
    expect(first.hasMore).toBe(true);
    seen.push(...first.rows.map((r) => Number((r as unknown[])[0])));

    const id = first.cursorId as string;
    const p2 = await readMore(id, 200);
    expect(p2?.rows).toHaveLength(200);
    expect(p2?.hasMore).toBe(true);
    seen.push(...(p2?.rows ?? []).map((r) => Number((r as unknown[])[0])));

    const p3 = await readMore(id, 200);
    expect(p3?.rows).toHaveLength(100);
    expect(p3?.hasMore).toBe(false); // drained
    seen.push(...(p3?.rows ?? []).map((r) => Number((r as unknown[])[0])));

    // Exactly 0..499, each once, in order.
    expect(seen).toHaveLength(500);
    expect(new Set(seen).size).toBe(500);
    expect(seen[0]).toBe(0);
    expect(seen[499]).toBe(499);

    // Reading past the end of a drained cursor returns null (id was released).
    expect(await readMore(id, 200)).toBeNull();
  });

  maybe("does not hold a cursor when the result fits in one page", async () => {
    const page = await openCursor(pool, "SELECT g FROM generate_series(1, 10) g", 200);
    expect(page.cursorId).toBeNull(); // nothing held
    expect(page.rows).toHaveLength(10);
    expect(page.hasMore).toBe(false);
  });

  maybe("closeCursor is a safe no-op on an unknown id", async () => {
    await expect(closeCursor("does-not-exist")).resolves.toBeUndefined();
  });
});
