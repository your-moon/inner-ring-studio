import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";

/**
 * Cloud-only row/cell comments. Anchored to (connection, table_ref, row_key)
 * and optionally a column. User-scoped in v1; the schema is ready to become
 * team-shared once workspaces land.
 */

export interface RowComment {
  id: string;
  body: string;
  columnName: string | null;
  authorEmail: string | null;
  createdAt: number;
  mine: boolean;
}

const ms = (v: Date | string): number => new Date(v).getTime();

/** Verify the connection belongs to the user (guards row_key enumeration). */
async function ownsConnection(userId: string, connectionId: string): Promise<boolean> {
  const r = await cloudPool().query(
    "SELECT 1 FROM connections WHERE id = $1 AND user_id = $2",
    [connectionId, userId]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function listComments(
  userId: string,
  connectionId: string,
  tableRef: string,
  rowKey: string
): Promise<RowComment[]> {
  await ensureSchema();
  if (!(await ownsConnection(userId, connectionId))) return [];
  const res = await cloudPool().query(
    `SELECT id, body, column_name, author_email, created_at, user_id
       FROM row_comments
      WHERE connection_id = $1 AND table_ref = $2 AND row_key = $3
      ORDER BY created_at`,
    [connectionId, tableRef, rowKey]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    body: r.body as string,
    columnName: (r.column_name as string) ?? null,
    authorEmail: (r.author_email as string) ?? null,
    createdAt: ms(r.created_at as string),
    mine: r.user_id === userId,
  }));
}

export async function addComment(
  userId: string,
  authorEmail: string | null,
  input: {
    connectionId: string;
    tableRef: string;
    rowKey: string;
    columnName?: string | null;
    body: string;
  }
): Promise<RowComment> {
  await ensureSchema();
  if (!(await ownsConnection(userId, input.connectionId))) {
    throw new Error("Unknown connection.");
  }
  const id = cloudNewId();
  const res = await cloudPool().query(
    `INSERT INTO row_comments
       (id, user_id, connection_id, table_ref, row_key, column_name, body, author_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, body, column_name, author_email, created_at`,
    [
      id,
      userId,
      input.connectionId,
      input.tableRef,
      input.rowKey,
      input.columnName ?? null,
      input.body,
      authorEmail,
    ]
  );
  const r = res.rows[0];
  return {
    id: r.id,
    body: r.body,
    columnName: r.column_name ?? null,
    authorEmail: r.author_email ?? null,
    createdAt: ms(r.created_at),
    mine: true,
  };
}

export async function deleteComment(userId: string, id: string): Promise<boolean> {
  await ensureSchema();
  const res = await cloudPool().query(
    "DELETE FROM row_comments WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Comment counts for many row_keys at once — used to badge rows in the grid. */
export async function commentCounts(
  userId: string,
  connectionId: string,
  tableRef: string,
  rowKeys: string[]
): Promise<Record<string, number>> {
  await ensureSchema();
  if (rowKeys.length === 0 || !(await ownsConnection(userId, connectionId))) return {};
  const res = await cloudPool().query(
    `SELECT row_key, count(*)::int AS n
       FROM row_comments
      WHERE connection_id = $1 AND table_ref = $2 AND row_key = ANY($3)
      GROUP BY row_key`,
    [connectionId, tableRef, rowKeys]
  );
  const out: Record<string, number> = {};
  for (const r of res.rows) out[r.row_key as string] = r.n as number;
  return out;
}
