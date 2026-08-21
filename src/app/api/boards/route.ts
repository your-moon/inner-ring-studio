import { workspaceRoute } from "@/lib/route";
import { createBoard, listBoards } from "@/lib/boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = workspaceRoute({}, async ({ ctx }) => {
  const boards = await listBoards(ctx.workspaceId);
  return { boards };
});

export const POST = workspaceRoute(
  { minRole: "editor", roleMessage: "Viewers can't create boards." },
  async ({ ctx, body }) => {
    const b = body as { name?: string; data?: Record<string, unknown> };
    // Import: a board name embedded in the blob wins when no explicit name given.
    const embeddedName =
      b.data && typeof b.data.name === "string" ? (b.data.name as string) : undefined;
    const name = b.name?.trim() || embeddedName?.trim() || "Untitled board";
    const board = await createBoard(ctx.workspaceId, ctx.userId, name, b.data);
    return { board };
  }
);
