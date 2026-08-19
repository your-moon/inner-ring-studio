import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import {
  deleteSchedule,
  getSchedule,
  listRuns,
  updateSchedule,
  type NewSchedule,
} from "@/lib/schedules";
import type { AlertOp } from "@/lib/query-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS: AlertOp[] = ["gt", "gte", "lt", "lte", "eq", "ne", "changed"];

async function guard(): Promise<{ userId: string } | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return { userId: auth.userId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const schedule = await getSchedule(g.userId, id);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });
  const runs = await listRuns(g.userId, id);
  return NextResponse.json({ schedule, runs });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<NewSchedule> & {
    enabled?: boolean;
  };
  if (body.alertOp && !OPS.includes(body.alertOp))
    return NextResponse.json({ error: "invalid alertOp" }, { status: 400 });
  if (body.intervalMin !== undefined) {
    const n = Number(body.intervalMin);
    if (!Number.isFinite(n) || n < 1)
      return NextResponse.json({ error: "invalid intervalMin" }, { status: 400 });
    body.intervalMin = Math.floor(n);
  }
  const schedule = await updateSchedule(g.userId, id, body);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ schedule });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const ok = await deleteSchedule(g.userId, id);
  return NextResponse.json({ ok });
}
