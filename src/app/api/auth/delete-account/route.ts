import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, requireAuth } from "@/lib/auth";
import { deleteUser } from "@/lib/cloud-db";
import { IS_CLOUD } from "@/lib/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permanently delete the signed-in user's account and all their connections
 * (cloud only). Requires the current password as confirmation.
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!IS_CLOUD || !auth.userId) {
    return NextResponse.json(
      { error: "Only available for cloud accounts." },
      { status: 400 }
    );
  }
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  const ok = await deleteUser(auth.userId, password ?? "");
  if (!ok) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
  }
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
