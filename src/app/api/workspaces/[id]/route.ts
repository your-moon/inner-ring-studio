import { authRoute, HttpError } from "@/lib/route";
import { deleteWorkspace, renameWorkspace } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = authRoute<{ name?: string }, { id: string }>(
  { forward: true, cloudOnly: true },
  async ({ ctx, params, body }) => {
    const name = body.name?.trim();
    if (!name) throw new HttpError(400, "Name is required.");
    const ok = await renameWorkspace(ctx.userId!, params.id, name);
    if (!ok) throw new HttpError(403, "Not allowed.");
    return { ok };
  }
);

export const DELETE = authRoute<unknown, { id: string }>(
  { forward: true, cloudOnly: true },
  async ({ ctx, params }) => {
    const ok = await deleteWorkspace(ctx.userId!, params.id);
    if (!ok)
      throw new HttpError(403, "Only the owner can delete a shared workspace.");
    return { ok };
  }
);
