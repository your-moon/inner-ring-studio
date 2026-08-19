import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import {
  listNotifications,
  markNotifications,
  unreadCount,
} from "@/lib/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Non-cloud has no notifications — return an empty, quiet payload so the nav
  // bell can call this unconditionally without special-casing the mode.
  if (!IS_CLOUD) return NextResponse.json({ notifications: [], unread: 0 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId) return NextResponse.json({ notifications: [], unread: 0 });
  const [notifications, unread] = await Promise.all([
    listNotifications(auth.userId),
    unreadCount(auth.userId),
  ]);
  return NextResponse.json({ notifications, unread });
}

export async function POST(req: Request) {
  if (!IS_CLOUD) return NextResponse.json({ ok: true });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    ids?: string[];
    all?: boolean;
  };
  await markNotifications(auth.userId, body.all ? "all" : body.ids ?? []);
  return NextResponse.json({ ok: true });
}
