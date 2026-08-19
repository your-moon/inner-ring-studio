import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";

/**
 * Cloud-only data access for dashboards (boards). `data` stores the full
 * DashboardProps (charts + layout + filters) as JSON. User-scoped throughout.
 */

export interface BoardSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export interface BoardRecord extends BoardSummary {
  data: Record<string, unknown>;
}

const ms = (v: Date | string): number => new Date(v).getTime();

// The query route installs a GLOBAL pg jsonb parser that returns raw text, so
// `data` can arrive as a JSON string here. Normalize to an object either way.
function asObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object") return v as Record<string, unknown>;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

/** An empty DashboardProps skeleton for a freshly created board. */
function emptyBoard(name: string): Record<string, unknown> {
  return { charts: [], layout: [], name, data: { filters: [] } };
}

export async function listBoards(userId: string): Promise<BoardSummary[]> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT id, name, updated_at FROM boards WHERE user_id = $1 ORDER BY updated_at DESC",
    [userId]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    updatedAt: ms(r.updated_at as string),
  }));
}

export async function getBoard(userId: string, id: string): Promise<BoardRecord | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT id, name, data, updated_at FROM boards WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    data: asObj(r.data),
    updatedAt: ms(r.updated_at),
  };
}

export async function createBoard(userId: string, name: string): Promise<BoardRecord> {
  await ensureSchema();
  const id = cloudNewId();
  const data = emptyBoard(name);
  const res = await cloudPool().query(
    "INSERT INTO boards (id, user_id, name, data) VALUES ($1,$2,$3,$4) RETURNING id, name, data, updated_at",
    [id, userId, name, JSON.stringify(data)]
  );
  const r = res.rows[0];
  return { id: r.id, name: r.name, data: asObj(r.data), updatedAt: ms(r.updated_at) };
}

export async function updateBoard(
  userId: string,
  id: string,
  patch: { name?: string; data?: Record<string, unknown> }
): Promise<BoardRecord | null> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push(`name = $${sets.length + 1}`);
    vals.push(patch.name);
  }
  if (patch.data !== undefined) {
    sets.push(`data = $${sets.length + 1}`);
    vals.push(JSON.stringify(patch.data));
  }
  if (sets.length === 0) return getBoard(userId, id);
  sets.push(`updated_at = now()`);
  vals.push(id, userId);
  const res = await cloudPool().query(
    `UPDATE boards SET ${sets.join(", ")}
     WHERE id = $${vals.length - 1} AND user_id = $${vals.length}
     RETURNING id, name, data, updated_at`,
    vals
  );
  const r = res.rows[0];
  return r ? { id: r.id, name: r.name, data: asObj(r.data), updatedAt: ms(r.updated_at) } : null;
}

export async function deleteBoard(userId: string, id: string): Promise<boolean> {
  await ensureSchema();
  const res = await cloudPool().query(
    "DELETE FROM boards WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}
