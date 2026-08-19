import type { Pool, PoolClient } from "pg";
import Cursor from "pg-cursor";

/**
 * The promise-style pg-cursor API (read(n) -> Promise, close() -> Promise). The
 * bundled @types/pg-cursor still models the older callback API, so we describe
 * the shape we actually use and cast the instance to it.
 */
interface PromiseCursor {
  read(rowCount: number): Promise<unknown[][]>;
  close(): Promise<void>;
  _result?: { fields?: CursorField[] };
}

/**
 * Held server-side cursors for incremental (lazy) fetching of editor results.
 *
 * The editor runs a query once; we open a Postgres cursor, read the first page,
 * and keep the cursor (and its checked-out client) open under an id. "Load more"
 * reads the next page from the SAME cursor. This is correct regardless of the
 * query's ORDER BY — unlike LIMIT/OFFSET re-runs, a single cursor never skips or
 * duplicates rows, and it never re-scans skipped rows on deep scrolls.
 *
 * The cost is a held connection per active result grid, so cursors are capped
 * and swept on idle: whichever comes first, a bounded pool of live cursors and a
 * short idle TTL, both releasing the client back to the pool.
 */

const PAGE_MIN = 50;
const PAGE_MAX = 1000;
const MAX_LIVE = 16; // cap concurrent held cursors (each holds one connection)
const IDLE_MS = 90_000; // release a cursor left untouched this long
const SWEEP_MS = 30_000;

export interface CursorField {
  name: string;
  dataTypeID: number;
}

interface Held {
  client: PoolClient;
  cursor: PromiseCursor;
  fields: CursorField[];
  lastUsed: number;
  closing: boolean;
  pool: Pool;
}

// Survive Next.js hot reloads: keep one registry on globalThis.
const g = globalThis as unknown as {
  __pmsqlCursors?: Map<string, Held>;
  __pmsqlCursorSweep?: ReturnType<typeof setInterval>;
};
const registry: Map<string, Held> = (g.__pmsqlCursors ??= new Map());

export function clampPageSize(n: unknown): number {
  const v = Math.floor(Number(n) || 200);
  return Math.min(PAGE_MAX, Math.max(PAGE_MIN, v));
}

function newId(): string {
  // crypto is available in the Node runtime; avoid importing for one call.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    registry.size.toString(36)
  );
}

async function destroy(id: string): Promise<void> {
  const held = registry.get(id);
  if (!held || held.closing) return;
  held.closing = true;
  registry.delete(id);
  try {
    await held.cursor.close();
  } catch {
    /* already gone */
  }
  try {
    held.client.release();
  } catch {
    /* already released */
  }
}

function ensureSweeper(): void {
  if (g.__pmsqlCursorSweep) return;
  g.__pmsqlCursorSweep = setInterval(() => {
    const now = Date.now();
    for (const [id, held] of registry) {
      if (now - held.lastUsed > IDLE_MS) void destroy(id);
    }
  }, SWEEP_MS);
  // Don't keep the process alive just for the sweeper.
  (g.__pmsqlCursorSweep as unknown as { unref?: () => void }).unref?.();
}

function fieldsOf(cursor: PromiseCursor): CursorField[] {
  return cursor._result?.fields ?? [];
}

export interface CursorPage {
  cursorId: string | null; // null when the result fit in one page (nothing held)
  fields: CursorField[];
  rows: unknown[][];
  hasMore: boolean;
}

/**
 * Open a cursor for `sql`, read the first page, and hold it open under an id if
 * (and only if) more rows may remain. If the whole result fit in one page, the
 * cursor is closed immediately and `cursorId` is null.
 */
export async function openCursor(
  pool: Pool,
  sql: string,
  pageSize: number
): Promise<CursorPage> {
  ensureSweeper();

  // Evict the oldest cursor if we're at the cap before taking a new connection.
  if (registry.size >= MAX_LIVE) {
    let oldestId: string | null = null;
    let oldest = Infinity;
    for (const [id, held] of registry) {
      if (held.lastUsed < oldest) {
        oldest = held.lastUsed;
        oldestId = id;
      }
    }
    if (oldestId) await destroy(oldestId);
  }

  const client = await pool.connect();
  let cursor: PromiseCursor;
  try {
    cursor = client.query(
      new Cursor(sql, [], { rowMode: "array" })
    ) as unknown as PromiseCursor;
  } catch (e) {
    client.release();
    throw e;
  }

  let rows: unknown[][];
  try {
    rows = await cursor.read(pageSize);
  } catch (e) {
    try {
      await cursor.close();
    } catch {
      /* ignore */
    }
    client.release();
    throw e;
  }

  const fields = fieldsOf(cursor);
  const hasMore = rows.length >= pageSize;

  if (!hasMore) {
    // Everything fit in one page — nothing to hold.
    try {
      await cursor.close();
    } catch {
      /* ignore */
    }
    client.release();
    return { cursorId: null, fields, rows, hasMore: false };
  }

  const id = newId();
  registry.set(id, {
    client,
    cursor,
    fields,
    lastUsed: Date.now(),
    closing: false,
    pool,
  });
  return { cursorId: id, fields, rows, hasMore: true };
}

/**
 * Release every held cursor belonging to a pool. Called before closing the pool
 * (disconnect), so `pool.end()` doesn't hang waiting on a checked-out cursor
 * client.
 */
export async function closeCursorsForPool(pool: Pool): Promise<void> {
  const ids = [...registry.entries()]
    .filter(([, h]) => h.pool === pool)
    .map(([id]) => id);
  await Promise.all(ids.map(destroy));
}

export interface CursorMore {
  fields: CursorField[];
  rows: unknown[][];
  hasMore: boolean;
}

/** Read the next page from a held cursor. Returns null if the id is unknown/expired. */
export async function readMore(
  cursorId: string,
  pageSize: number
): Promise<CursorMore | null> {
  const held = registry.get(cursorId);
  if (!held || held.closing) return null;
  held.lastUsed = Date.now();

  let rows: unknown[][];
  try {
    rows = await held.cursor.read(pageSize);
  } catch (e) {
    await destroy(cursorId);
    throw e;
  }

  const hasMore = rows.length >= pageSize;
  if (!hasMore) await destroy(cursorId); // drained — free the connection now
  return { fields: held.fields, rows, hasMore };
}

/** Best-effort explicit close (e.g. when a result tab is closed). */
export async function closeCursor(cursorId: string): Promise<void> {
  await destroy(cursorId);
}
