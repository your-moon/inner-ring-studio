import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";

/**
 * Public shareable result snapshots: a static capture of a query's columns and
 * rows, readable by anyone with the token. Created by a workspace member; the
 * public read path takes only a token and is not workspace-scoped.
 */

const MAX_ROWS = 1000;
const MAX_COLS = 60;

export interface Snapshot {
  token: string;
  title: string;
  sql: string | null;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  createdAt: number;
}

export interface SnapshotSummary {
  token: string;
  title: string;
  rowCount: number;
  createdAt: number;
}

const ms = (v: Date | string): number => new Date(v).getTime();

export async function createSnapshot(
  workspaceId: string,
  userId: string,
  input: { title: string; sql?: string | null; columns: string[]; rows: unknown[][] }
): Promise<{ token: string }> {
  await ensureSchema();
  const columns = input.columns.slice(0, MAX_COLS);
  const rows = input.rows.slice(0, MAX_ROWS).map((r) => r.slice(0, MAX_COLS));
  const token = cloudNewId() + cloudNewId(); // 192-bit unguessable token
  await cloudPool().query(
    `INSERT INTO shared_snapshots (token, workspace_id, created_by, title, sql, columns, rows, row_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      token,
      workspaceId,
      userId,
      input.title.slice(0, 200) || "Shared result",
      input.sql ?? null,
      JSON.stringify(columns),
      JSON.stringify(rows),
      input.rows.length,
    ]
  );
  return { token };
}

const asArr = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Public read — token only, no auth, not workspace-scoped. */
export async function getSnapshot(token: string): Promise<Snapshot | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT token, title, sql, columns, rows, row_count, created_at FROM shared_snapshots WHERE token = $1",
    [token]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    token: r.token,
    title: r.title,
    sql: r.sql ?? null,
    columns: asArr(r.columns) as string[],
    rows: asArr(r.rows) as unknown[][],
    rowCount: r.row_count,
    createdAt: ms(r.created_at),
  };
}

export async function listSnapshots(workspaceId: string): Promise<SnapshotSummary[]> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT token, title, row_count, created_at FROM shared_snapshots WHERE workspace_id = $1 ORDER BY created_at DESC",
    [workspaceId]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    token: r.token as string,
    title: r.title as string,
    rowCount: r.row_count as number,
    createdAt: ms(r.created_at as string),
  }));
}

/** Revoke a snapshot (scoped to the workspace that owns it). */
export async function deleteSnapshot(workspaceId: string, token: string): Promise<boolean> {
  await ensureSchema();
  const res = await cloudPool().query(
    "DELETE FROM shared_snapshots WHERE token = $1 AND workspace_id = $2",
    [token, workspaceId]
  );
  return (res.rowCount ?? 0) > 0;
}
