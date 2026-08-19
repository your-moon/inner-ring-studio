import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { changePassword } from "@/lib/cloud-db";
import { IS_CLOUD } from "@/lib/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Change the signed-in user's password (cloud accounts only). */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!IS_CLOUD || !auth.userId) {
    return NextResponse.json(
      { error: "Only available for cloud accounts." },
      { status: 400 }
    );
  }
  const { current, next } = (await req.json().catch(() => ({}))) as {
    current?: string;
    next?: string;
  };
  if (!next || next.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }
  const ok = await changePassword(auth.userId, current ?? "", next);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}
