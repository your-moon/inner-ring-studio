import { authRoute, HttpError } from "@/lib/route";
import {
  listMembers,
  removeMember,
  setMemberRole,
  type Role,
} from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: Role[] = ["owner", "editor", "viewer"];

export const GET = authRoute<unknown, { id: string }>(
  { forward: true, cloudOnly: true },
  async ({ ctx, params }) => {
    const members = await listMembers(ctx.userId!, params.id);
    if (!members) throw new HttpError(404, "not found");
    return { members };
  }
);

export const PATCH = authRoute<{ memberId?: string; role?: Role }, { id: string }>(
  { forward: true, cloudOnly: true },
  async ({ ctx, params, body }) => {
    if (!body.memberId || !ROLES.includes(body.role as Role))
      throw new HttpError(400, "memberId and a valid role are required.");
    const ok = await setMemberRole(
      ctx.userId!,
      params.id,
      body.memberId,
      body.role as Role
    );
    if (!ok) throw new HttpError(403, "Not allowed.");
    return { ok };
  }
);

export const DELETE = authRoute<unknown, { id: string }>(
  { forward: true, cloudOnly: true },
  async ({ ctx, params, req }) => {
    const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
    if (!memberId) throw new HttpError(400, "memberId required");
    const ok = await removeMember(ctx.userId!, params.id, memberId);
    if (!ok) throw new HttpError(403, "Not allowed.");
    return { ok };
  }
);
