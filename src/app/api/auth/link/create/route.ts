import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import { createLinkCode } from "@/lib/cloud-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a one-time link code for the signed-in cloud user. Called from the /link
 * consent page (in the browser). The desktop then redeems the code via
 * /api/auth/link/exchange.
 */
export async function POST() {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "cloud only" }, { status: 404 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await createLinkCode(auth.userId);
  if (!res)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json({ code: res.code, email: res.email });
}
