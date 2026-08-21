import { cookies } from "next/headers";
import { authRoute, HttpError } from "@/lib/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { deleteUser } from "@/lib/cloud-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permanently delete the signed-in user's account and all their connections
 * (cloud only). Requires the current password as confirmation.
 */
export const POST = authRoute(
  {
    cloudOnly: true,
    whenNotCloud: () =>
      Response.json({ error: "Only available for cloud accounts." }, { status: 400 }),
  },
  async ({ ctx, body }) => {
    const { password } = body as { password?: string };
    const ok = await deleteUser(ctx.userId!, password ?? "");
    if (!ok) throw new HttpError(401, "Password is incorrect.");
    (await cookies()).delete(SESSION_COOKIE);
    return { ok: true };
  }
);
