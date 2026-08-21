import { workspaceRoute, HttpError } from "@/lib/route";
import { addComment, deleteComment, listComments } from "@/lib/comments";
import { getUserById } from "@/lib/cloud-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Off-cloud, comments are simply absent — the client renders nothing and treats
// them as a Cloud-only capability without special-casing the request.
const notCloud = () => Response.json({ cloud: false, comments: [] });

export const GET = workspaceRoute(
  { whenNotCloud: notCloud },
  async ({ ctx, req }) => {
    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connectionId") ?? "";
    const table = url.searchParams.get("table") ?? "";
    const rowKey = url.searchParams.get("rowKey") ?? "";
    if (!connectionId || !table || !rowKey)
      return { cloud: true, comments: [] };
    const comments = await listComments(
      ctx.workspaceId,
      ctx.userId,
      connectionId,
      table,
      rowKey
    );
    return { cloud: true, comments };
  }
);

// Any member (viewer included) can comment — that's the collaboration point.
export const POST = workspaceRoute(
  { whenNotCloud: notCloud },
  async ({ ctx, body }) => {
    const b = body as {
      connectionId?: string;
      table?: string;
      rowKey?: string;
      columnName?: string | null;
      body?: string;
    };
    const text = b.body?.trim();
    if (!b.connectionId || !b.table || !b.rowKey || !text)
      throw new HttpError(
        400,
        "connectionId, table, rowKey, and body are required."
      );
    const user = await getUserById(ctx.userId);
    try {
      const comment = await addComment(ctx.workspaceId, ctx.userId, user?.email ?? null, {
        connectionId: b.connectionId,
        tableRef: b.table,
        rowKey: b.rowKey,
        columnName: b.columnName ?? null,
        body: text,
      });
      return { comment };
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
  }
);

export const DELETE = workspaceRoute(
  { whenNotCloud: notCloud },
  async ({ ctx, req }) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id) throw new HttpError(400, "id required");
    const ok = await deleteComment(ctx.userId, id);
    return { ok };
  }
);
