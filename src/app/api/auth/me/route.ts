import { NextResponse } from "next/server";
import { authEnabled, isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    authEnabled: authEnabled(),
    authed: await isAuthed(),
  });
}
