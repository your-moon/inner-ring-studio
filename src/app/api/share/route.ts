import { workspaceRoute, HttpError } from "@/lib/route";
import { createSnapshot } from "@/lib/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a public snapshot from a query result. Any workspace member may share. */
export const POST = workspaceRoute({}, async ({ ctx, body }) => {
  const b = body as {
    title?: string;
    sql?: string;
    columns?: string[];
    rows?: unknown[][];
  };
  if (!Array.isArray(b.columns) || !Array.isArray(b.rows))
    throw new HttpError(400, "columns and rows are required.");
  const { token } = await createSnapshot(ctx.workspaceId, ctx.userId, {
    title: (b.title ?? "").trim() || "Shared result",
    sql: b.sql ?? null,
    columns: b.columns,
    rows: b.rows,
  });
  return { token };
});
