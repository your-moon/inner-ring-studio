import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authEnabled,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: true, authEnabled: false });
  }
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }
  const token = await createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return NextResponse.json({ ok: true });
}
