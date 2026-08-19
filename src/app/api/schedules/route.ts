import { NextResponse } from "next/server";
import { IS_CLOUD } from "@/lib/mode";
import { requireWorkspace } from "@/lib/workspace-context";
import { roleAtLeast } from "@/lib/workspaces";
import { createSchedule, listSchedules, type NewSchedule } from "@/lib/schedules";
import type { AlertOp } from "@/lib/query-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS: AlertOp[] = ["gt", "gte", "lt", "lte", "eq", "ne", "changed"];

function cloudOnly(): Response | null {
  if (!IS_CLOUD)
    return NextResponse.json(
      { error: "Scheduled queries are a Cloud feature." },
      { status: 404 }
    );
  return null;
}

export async function GET() {
  const gate = cloudOnly();
  if (gate) return gate;
  const ctx = await requireWorkspace();
  if (ctx instanceof Response) return ctx;
  const schedules = await listSchedules(ctx.workspaceId);
  return NextResponse.json({ schedules });
}

export async function POST(req: Request) {
  const gate = cloudOnly();
  if (gate) return gate;
  const ctx = await requireWorkspace();
  if (ctx instanceof Response) return ctx;
  if (!roleAtLeast(ctx.role, "editor"))
    return NextResponse.json({ error: "Viewers can't create schedules." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Partial<NewSchedule>;
  const name = body.name?.trim();
  const sql = body.sql?.trim();
  const connectionId = body.connectionId?.trim();
  const intervalMin = Number(body.intervalMin);

  if (!name || !sql || !connectionId)
    return NextResponse.json(
      { error: "name, sql, and connectionId are required." },
      { status: 400 }
    );
  if (!Number.isFinite(intervalMin) || intervalMin < 1)
    return NextResponse.json(
      { error: "intervalMin must be a positive number of minutes." },
      { status: 400 }
    );
  const alertOp = body.alertOp ?? null;
  if (alertOp && !OPS.includes(alertOp))
    return NextResponse.json({ error: "invalid alertOp" }, { status: 400 });
  const alertMetric = body.alertMetric === "value" ? "value" : "rowcount";

  try {
    const schedule = await createSchedule(ctx.workspaceId, ctx.userId, {
      name,
      sql,
      connectionId,
      intervalMin: Math.floor(intervalMin),
      alertMetric,
      alertOp,
      alertValue: body.alertValue == null ? null : Number(body.alertValue),
    });
    return NextResponse.json({ schedule });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
