import { NextResponse } from "next/server";
import { authEnabled, getAuthContext } from "@/lib/auth";
import { getUserById } from "@/lib/cloud-db";
import { IS_CLOUD } from "@/lib/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  let email: string | null = null;
  if (IS_CLOUD && ctx?.userId) {
    email = (await getUserById(ctx.userId).catch(() => null))?.email ?? null;
  }
  return NextResponse.json({
    mode: IS_CLOUD ? "cloud" : "selfhosted",
    // In cloud mode, login (email+password) is always required.
    authEnabled: IS_CLOUD || authEnabled(),
    authed: ctx !== null,
    userId: ctx?.userId ?? null,
    email,
  });
}
