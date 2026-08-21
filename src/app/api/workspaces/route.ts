import { authRoute, HttpError } from "@/lib/route";
import { createWorkspace, listMyWorkspaces } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = authRoute({ forward: true, cloudOnly: true }, async ({ ctx }) => {
  const workspaces = await listMyWorkspaces(ctx.userId!);
  return { workspaces };
});

export const POST = authRoute(
  { forward: true, cloudOnly: true },
  async ({ ctx, body }) => {
    const name = (body as { name?: string }).name?.trim();
    if (!name) throw new HttpError(400, "Name is required.");
    const workspace = await createWorkspace(ctx.userId!, name);
    return { workspace };
  }
);
