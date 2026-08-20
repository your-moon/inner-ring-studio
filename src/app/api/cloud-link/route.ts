import { NextResponse } from "next/server";
import {
  clearCloudSession,
  cloudLinkUrl,
  getCloudSession,
  IS_LINKED,
  setCloudSession,
} from "@/lib/cloud-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status of the desktop's link to a cloud account. */
export async function GET() {
  const session = getCloudSession();
  return NextResponse.json({
    linked: IS_LINKED,
    cloudUrl: cloudLinkUrl(),
    signedIn: !!session,
    email: session?.email ?? null,
  });
}

/** Sign in to the linked cloud account (stores the remote session locally). */
export async function POST(req: Request) {
  const url = cloudLinkUrl();
  if (!IS_LINKED || !url)
    return NextResponse.json({ error: "This build isn't linked to a cloud." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!body.email || !body.password)
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const res = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  }).catch(() => null);
  if (!res) return NextResponse.json({ error: "Cloud unreachable." }, { status: 502 });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return NextResponse.json({ error: j.error || "Invalid email or password." }, { status: 401 });
  }
  // Capture the remote session cookie.
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.match(/^(irs_session=[^;]+)/)?.[1])
    .find(Boolean);
  if (!cookie)
    return NextResponse.json({ error: "Cloud login didn't return a session." }, { status: 502 });
  setCloudSession({ cookie, email: body.email.trim().toLowerCase() });
  return NextResponse.json({ ok: true, email: body.email.trim().toLowerCase() });
}

/** Unlink (sign out of the cloud account). */
export async function DELETE() {
  clearCloudSession();
  return NextResponse.json({ ok: true });
}
