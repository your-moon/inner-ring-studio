import { workspaceRoute, HttpError } from "@/lib/route";
import { createSchedule, listSchedules, type NewSchedule } from "@/lib/schedules";
import type { AlertOp } from "@/lib/query-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS: AlertOp[] = ["gt", "gte", "lt", "lte", "eq", "ne", "changed"];

export const GET = workspaceRoute({}, async ({ ctx }) => {
  const schedules = await listSchedules(ctx.workspaceId);
  return { schedules };
});

export const POST = workspaceRoute(
  { minRole: "editor", roleMessage: "Viewers can't create schedules." },
  async ({ ctx, body }) => {
    const b = body as Partial<NewSchedule>;
    const name = b.name?.trim();
    const sql = b.sql?.trim();
    const connectionId = b.connectionId?.trim();
    const intervalMin = Number(b.intervalMin);

    if (!name || !sql || !connectionId)
      throw new HttpError(400, "name, sql, and connectionId are required.");
    if (!Number.isFinite(intervalMin) || intervalMin < 1)
      throw new HttpError(400, "intervalMin must be a positive number of minutes.");
    const alertOp = b.alertOp ?? null;
    if (alertOp && !OPS.includes(alertOp))
      throw new HttpError(400, "invalid alertOp");
    const alertMetric = b.alertMetric === "value" ? "value" : "rowcount";

    try {
      const schedule = await createSchedule(ctx.workspaceId, ctx.userId, {
        name,
        sql,
        connectionId,
        intervalMin: Math.floor(intervalMin),
        alertMetric,
        alertOp,
        alertValue: b.alertValue == null ? null : Number(b.alertValue),
      });
      return { schedule };
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
  }
);
