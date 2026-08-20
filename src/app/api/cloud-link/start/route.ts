import { NextResponse } from "next/server";
import { cloudLinkUrl, IS_LINKED } from "@/lib/cloud-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Build the cloud consent URL to open in the system browser. It carries this
 * desktop's own loopback callback so the cloud can redirect back after sign-in.
 */
export async function GET(req: Request) {
  const cloud = cloudLinkUrl();
  if (!IS_LINKED || !cloud)
    return NextResponse.json({ error: "not linked" }, { status: 404 });
  const host = req.headers.get("host") ?? "127.0.0.1";
  const cb = `http://${host}/api/cloud-link/callback`;
  const url = `${cloud}/link?cb=${encodeURIComponent(cb)}`;
  return NextResponse.json({ url });
}
