import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authEnabled,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { authenticateUser } from "@/lib/cloud-users";
import { IS_CLOUD } from "@/lib/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory brute-force protection: cap failed logins per client IP.
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function setSession(userId: string | null): Promise<void> {
  const token = await createSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now < rec.resetAt && rec.count >= MAX_FAILS) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }
  const recordFail = () => {
    const cur = rec && now < rec.resetAt ? rec : { count: 0, resetAt: now + WINDOW_MS };
    cur.count += 1;
    attempts.set(ip, cur);
  };

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (IS_CLOUD) {
    const user =
      body.email && body.password
        ? await authenticateUser(body.email, body.password)
        : null;
    if (!user) {
      recordFail();
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    attempts.delete(ip);
    await setSession(user.id);
    return NextResponse.json({ ok: true, user: { email: user.email } });
  }

  // Self-hosted / desktop: single app password (or no auth at all).
  if (!authEnabled()) {
    return NextResponse.json({ ok: true, authEnabled: false });
  }
  if (!body.password || !verifyPassword(body.password)) {
    recordFail();
    return NextResponse.json({ error: "invalid password" }, { status: 401 });
  }
  attempts.delete(ip);
  await setSession(null);
  return NextResponse.json({ ok: true });
}
