import { authRoute, HttpError } from "@/lib/route";
import { createInvite, type Role } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: Role[] = ["owner", "editor", "viewer"];

export const POST = authRoute<{ email?: string; role?: Role }, { id: string }>(
  { forward: true, cloudOnly: true },
  async ({ ctx, params, body }) => {
    const email = body.email?.trim();
    const role = ROLES.includes(body.role as Role) ? (body.role as Role) : "editor";
    if (!email) throw new HttpError(400, "Email is required.");
    const r = await createInvite(ctx.userId!, params.id, email, role);
    if (!r.ok) throw new HttpError(400, r.error ?? "Invite failed.");
    return { token: r.token, addedDirectly: r.addedDirectly };
  }
);
