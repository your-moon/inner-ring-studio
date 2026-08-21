import type { PgConnConfig } from "@/lib/pg-pool";
import { closePool } from "@/lib/pg-pool";
import { postgresExecutor } from "./postgres";

/**
 * End-to-end smoke test for the per-driver query executor (Candidate 2 refactor)
 * against a real Postgres — exercises all five verbs the query route dispatches
 * to: single, statements (transaction), paginate (held cursor), fetchMore, and
 * closeCursor. Skips if the seeded local DB isn't reachable (e.g. CI), like the
 * other integration tests here.
 */
const cfg: PgConnConfig = {
  host: "localhost",
  port: 5434,
  database: "shop",
  user: "shop",
  password: "shop",
  ssl: false,
  readOnly: false,
  driver: "postgres",
};

let reachable = false;

beforeAll(async () => {
  try {
    await postgresExecutor.single(cfg, "SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  await closePool(cfg).catch(() => {});
});

const maybe = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!reachable) return console.warn("PG unreachable — skipping:", name);
    await fn();
  });

const rowsOf = (result: unknown) =>
  (result as { rows: unknown[] }).rows;

describe("postgres executor (integration)", () => {
  maybe("single returns a shaped result set", async () => {
    const r = await postgresExecutor.single(cfg, "SELECT 1 AS x");
    expect(rowsOf(r.result)).toEqual([{ x: 1 }]);
  });

  maybe("paginate → fetchMore → close drains every row once, in order", async () => {
    const sql = "SELECT g AS n FROM generate_series(1, 500) g ORDER BY g";
    const first = await postgresExecutor.paginate(cfg, sql, 100);
    expect(first.cursorId).toBeTruthy();
    expect(first.hasMore).toBe(true);

    const seen: number[] = rowsOf(first.result).map((r) => (r as { n: number }).n);
    const cursorId = first.cursorId as string; // PG reuses this id across pages
    for (let guard = 0; guard < 20; guard++) {
      const page = await postgresExecutor.fetchMore(cfg, cursorId, 100);
      seen.push(...page.rows.map((r) => (r as { n: number }).n));
      if (!page.hasMore) break;
    }
    await postgresExecutor.closeCursor(cfg, cursorId);

    // every row exactly once, in order
    expect(seen.length).toBe(500);
    expect(seen[0]).toBe(1);
    expect(seen[499]).toBe(500);
    expect(new Set(seen).size).toBe(500);
  });

  maybe("statements runs a batch in one transaction", async () => {
    const r = await postgresExecutor.statements(cfg, [
      "SELECT 1 AS a",
      "SELECT 2 AS b",
    ]);
    expect(r.results).toHaveLength(2);
    expect(rowsOf(r.results[0])).toEqual([{ a: 1 }]);
    expect(rowsOf(r.results[1])).toEqual([{ b: 2 }]);
  });

  maybe("closeCursor is a safe no-op on an unknown id", async () => {
    await expect(
      postgresExecutor.closeCursor(cfg, "does-not-exist")
    ).resolves.toBeUndefined();
  });
});
