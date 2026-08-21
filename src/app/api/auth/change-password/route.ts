import { authRoute, HttpError } from "@/lib/route";
import { changePassword } from "@/lib/cloud-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Change the signed-in user's password (cloud accounts only). */
export const POST = authRoute(
  {
    cloudOnly: true,
    whenNotCloud: () =>
      Response.json({ error: "Only available for cloud accounts." }, { status: 400 }),
  },
  async ({ ctx, body }) => {
    const { current, next } = body as { current?: string; next?: string };
    if (!next || next.length < 8)
      throw new HttpError(400, "New password must be at least 8 characters.");
    const ok = await changePassword(ctx.userId!, current ?? "", next);
    if (!ok) throw new HttpError(401, "Current password is incorrect.");
    return { ok: true };
  }
);
