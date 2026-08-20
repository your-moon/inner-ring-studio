import { NextResponse } from "next/server";
import { IS_CLOUD } from "@/lib/mode";
import { consumeLinkCode } from "@/lib/cloud-db";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redeem a one-time link code (server-to-server, called by the desktop). Returns
 * the cloud session cookie string the desktop stores to act on the user's behalf.
 */
export async function POST(req: Request) {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "cloud only" }, { status: 404 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code)
    return NextResponse.json({ error: "code required" }, { status: 400 });
  const r = await consumeLinkCode(code);
  if (!r)
    return NextResponse.json(
      { error: "invalid or expired code" },
      { status: 400 }
    );
  return NextResponse.json({ cookie: `${SESSION_COOKIE}=${r.token}`, email: r.email });
}
