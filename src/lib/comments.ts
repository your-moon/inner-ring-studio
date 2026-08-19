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

/** Verify the connection belongs to the active workspace (guards enumeration). */
async function connectionInWorkspace(workspaceId: string, connectionId: string): Promise<boolean> {
  const r = await cloudPool().query(
    "SELECT 1 FROM connections WHERE id = $1 AND workspace_id = $2",
    [connectionId, workspaceId]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function listComments(
  workspaceId: string,
  userId: string,
  connectionId: string,
  tableRef: string,
  rowKey: string
): Promise<RowComment[]> {
  await ensureSchema();
  if (!(await connectionInWorkspace(workspaceId, connectionId))) return [];
  // All members' comments on the row (scoped to the workspace).
  const res = await cloudPool().query(
    `SELECT id, body, column_name, author_email, created_at, user_id
       FROM row_comments
      WHERE workspace_id = $1 AND connection_id = $2 AND table_ref = $3 AND row_key = $4
      ORDER BY created_at`,
    [workspaceId, connectionId, tableRef, rowKey]
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
  workspaceId: string,
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
  if (!(await connectionInWorkspace(workspaceId, input.connectionId))) {
    throw new Error("Unknown connection.");
  }
  const id = cloudNewId();
  const res = await cloudPool().query(
    `INSERT INTO row_comments
       (id, user_id, workspace_id, connection_id, table_ref, row_key, column_name, body, author_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, body, column_name, author_email, created_at`,
    [
      id,
      userId,
      workspaceId,
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
