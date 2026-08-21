import { workspaceRoute, HttpError } from "@/lib/route";
import { deleteBoard, getBoard, updateBoard } from "@/lib/boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = workspaceRoute<unknown, { id: string }>(
  {},
  async ({ ctx, params }) => {
    const board = await getBoard(ctx.workspaceId, params.id);
    if (!board) throw new HttpError(404, "not found");
    return { board };
  }
);

export const PUT = workspaceRoute<
  { name?: string; data?: Record<string, unknown> },
  { id: string }
>(
  { minRole: "editor", roleMessage: "Viewers can't edit boards." },
  async ({ ctx, params, body }) => {
    const board = await updateBoard(ctx.workspaceId, params.id, {
      name: body.name,
      data: body.data,
    });
    if (!board) throw new HttpError(404, "not found");
    return { board };
  }
);

export const DELETE = workspaceRoute<unknown, { id: string }>(
  { minRole: "editor", roleMessage: "Viewers can't delete boards." },
  async ({ ctx, params }) => {
    const ok = await deleteBoard(ctx.workspaceId, params.id);
    return { ok };
  }
);
