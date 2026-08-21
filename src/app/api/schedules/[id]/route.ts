import { workspaceRoute, HttpError } from "@/lib/route";
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

export const GET = workspaceRoute<unknown, { id: string }>(
  {},
  async ({ ctx, params }) => {
    const schedule = await getSchedule(ctx.workspaceId, params.id);
    if (!schedule) throw new HttpError(404, "not found");
    const runs = await listRuns(ctx.workspaceId, params.id);
    return { schedule, runs };
  }
);

export const PATCH = workspaceRoute<
  Partial<NewSchedule> & { enabled?: boolean },
  { id: string }
>(
  { minRole: "editor", roleMessage: "Viewers can't edit schedules." },
  async ({ ctx, params, body }) => {
    if (body.alertOp && !OPS.includes(body.alertOp))
      throw new HttpError(400, "invalid alertOp");
    if (body.intervalMin !== undefined) {
      const n = Number(body.intervalMin);
      if (!Number.isFinite(n) || n < 1)
        throw new HttpError(400, "invalid intervalMin");
      body.intervalMin = Math.floor(n);
    }
    const schedule = await updateSchedule(ctx.workspaceId, params.id, body);
    if (!schedule) throw new HttpError(404, "not found");
    return { schedule };
  }
);

export const DELETE = workspaceRoute<unknown, { id: string }>(
  { minRole: "editor", roleMessage: "Viewers can't delete schedules." },
  async ({ ctx, params }) => {
    const ok = await deleteSchedule(ctx.workspaceId, params.id);
    return { ok };
  }
);
