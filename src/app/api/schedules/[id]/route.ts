import { NextResponse } from "next/server";
import { IS_LINKED, forwardToCloud } from "@/lib/cloud-link";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace, type WorkspaceContext } from "@/lib/workspace-context";
import { roleAtLeast } from "@/lib/workspaces";
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

async function guard(): Promise<WorkspaceContext | Response> {
  if (!IS_CLOUD)
    return NextResponse.json({ error: "Cloud feature." }, { status: 404 });
  return requireWorkspace();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(_req);
  const g = await guard();
  if (g instanceof Response) return g;
  const { id } = await params;
  const schedule = await getSchedule(g.workspaceId, id);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });
  const runs = await listRuns(g.workspaceId, id);
  return NextResponse.json({ schedule, runs });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(req);
  const g = await guard();
  if (g instanceof Response) return g;
  if (!roleAtLeast(g.role, "editor"))
    return NextResponse.json({ error: "Viewers can't edit schedules." }, { status: 403 });
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
  const schedule = await updateSchedule(g.workspaceId, id, body);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ schedule });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (IS_LINKED) return forwardToCloud(_req);
  const g = await guard();
  if (g instanceof Response) return g;
  if (!roleAtLeast(g.role, "editor"))
    return NextResponse.json({ error: "Viewers can't delete schedules." }, { status: 403 });
  const { id } = await params;
  const ok = await deleteSchedule(g.workspaceId, id);
  return NextResponse.json({ ok });
}
