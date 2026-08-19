import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";
import type { AlertOp } from "./query-runner";

/**
 * Cloud-only data access for scheduled queries, their run history, and the
 * in-app notifications alerts produce. Every user-facing function is scoped by
 * user_id; the scheduler-facing helpers (getDueSchedules / recordRun) run
 * system-wide and are only called by the background ticker.
 */

export type AlertMetric = "rowcount" | "value";

export interface Schedule {
  id: string;
  connectionId: string;
  name: string;
  sql: string;
  intervalMin: number;
  alertMetric: AlertMetric;
  alertOp: AlertOp | null;
  alertValue: number | null;
  enabled: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  createdAt: number;
}

export interface ScheduleRun {
  id: string;
  ranAt: number;
  status: "ok" | "error";
  rowCount: number | null;
  metricVal: number | null;
  alerted: boolean;
  durationMs: number | null;
  error: string | null;
  snapshot: { columns: string[]; rows: unknown[][] } | null;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  schedId: string | null;
  read: boolean;
  createdAt: number;
}

export interface NewSchedule {
  connectionId: string;
  name: string;
  sql: string;
  intervalMin: number;
  alertMetric?: AlertMetric;
  alertOp?: AlertOp | null;
  alertValue?: number | null;
}

const ms = (v: Date | string | null): number | null =>
  v == null ? null : new Date(v).getTime();

interface SchedRow {
  id: string;
  connection_id: string;
  name: string;
  sql: string;
  interval_min: number;
  alert_metric: string;
  alert_op: string | null;
  alert_value: number | null;
  enabled: boolean;
  last_run_at: Date | string | null;
  next_run_at: Date | string | null;
  created_at: Date | string;
}

function toSchedule(r: SchedRow): Schedule {
  return {
    id: r.id,
    connectionId: r.connection_id,
    name: r.name,
    sql: r.sql,
    intervalMin: r.interval_min,
    alertMetric: r.alert_metric as AlertMetric,
    alertOp: (r.alert_op as AlertOp) ?? null,
    alertValue: r.alert_value,
    enabled: r.enabled,
    lastRunAt: ms(r.last_run_at),
    nextRunAt: ms(r.next_run_at),
    createdAt: ms(r.created_at)!,
  };
}

// --------------------------- user-scoped ---------------------------

export async function listSchedules(userId: string): Promise<Schedule[]> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT * FROM scheduled_queries WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return (res.rows as SchedRow[]).map(toSchedule);
}

export async function getSchedule(userId: string, id: string): Promise<Schedule | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT * FROM scheduled_queries WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  const r = res.rows[0] as SchedRow | undefined;
  return r ? toSchedule(r) : null;
}

export async function createSchedule(userId: string, input: NewSchedule): Promise<Schedule> {
  await ensureSchema();
  // Ownership check: the connection must belong to this user.
  const own = await cloudPool().query(
    "SELECT 1 FROM connections WHERE id = $1 AND user_id = $2",
    [input.connectionId, userId]
  );
  if (own.rowCount === 0) throw new Error("Unknown connection.");
  const id = cloudNewId();
  const res = await cloudPool().query(
    `INSERT INTO scheduled_queries
       (id, user_id, connection_id, name, sql, interval_min, alert_metric, alert_op, alert_value, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now() + make_interval(mins => $6))
     RETURNING *`,
    [
      id,
      userId,
      input.connectionId,
      input.name,
      input.sql,
      input.intervalMin,
      input.alertMetric ?? "rowcount",
      input.alertOp ?? null,
      input.alertValue ?? null,
    ]
  );
  return toSchedule(res.rows[0] as SchedRow);
}

export async function updateSchedule(
  userId: string,
  id: string,
  patch: Partial<NewSchedule> & { enabled?: boolean }
): Promise<Schedule | null> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  const col = (c: string, v: unknown) => {
    sets.push(`${c} = $${sets.length + 1}`);
    vals.push(v);
  };
  if (patch.name !== undefined) col("name", patch.name);
  if (patch.sql !== undefined) col("sql", patch.sql);
  if (patch.intervalMin !== undefined) col("interval_min", patch.intervalMin);
  if (patch.alertMetric !== undefined) col("alert_metric", patch.alertMetric);
  if (patch.alertOp !== undefined) col("alert_op", patch.alertOp ?? null);
  if (patch.alertValue !== undefined) col("alert_value", patch.alertValue ?? null);
  if (patch.enabled !== undefined) {
    col("enabled", patch.enabled);
    // Re-enabling schedules a run soon; disabling leaves next_run_at untouched.
    if (patch.enabled) sets.push(`next_run_at = now()`);
  }
  if (sets.length === 0) return getSchedule(userId, id);
  vals.push(id, userId);
  const res = await cloudPool().query(
    `UPDATE scheduled_queries SET ${sets.join(", ")}
     WHERE id = $${vals.length - 1} AND user_id = $${vals.length} RETURNING *`,
    vals
  );
  const r = res.rows[0] as SchedRow | undefined;
  return r ? toSchedule(r) : null;
}

export async function deleteSchedule(userId: string, id: string): Promise<boolean> {
  await ensureSchema();
  const res = await cloudPool().query(
    "DELETE FROM scheduled_queries WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listRuns(
  userId: string,
  schedId: string,
  limit = 20
): Promise<ScheduleRun[]> {
  await ensureSchema();
  const res = await cloudPool().query(
    `SELECT r.* FROM schedule_runs r
       JOIN scheduled_queries s ON s.id = r.sched_id
      WHERE r.sched_id = $1 AND s.user_id = $2
      ORDER BY r.ran_at DESC LIMIT $3`,
    [schedId, userId, limit]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    ranAt: ms(r.ran_at as string)!,
    status: r.status as "ok" | "error",
    rowCount: (r.row_count as number) ?? null,
    metricVal: (r.metric_val as number) ?? null,
    alerted: Boolean(r.alerted),
    durationMs: (r.duration_ms as number) ?? null,
    error: (r.error as string) ?? null,
    snapshot: (r.snapshot as ScheduleRun["snapshot"]) ?? null,
  }));
}

// --------------------------- notifications ---------------------------

export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    kind: r.kind as string,
    title: r.title as string,
    body: (r.body as string) ?? null,
    schedId: (r.sched_id as string) ?? null,
    read: Boolean(r.read),
    createdAt: ms(r.created_at as string)!,
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read = false",
    [userId]
  );
  return (res.rows[0]?.n as number) ?? 0;
}

export async function markNotifications(
  userId: string,
  ids: string[] | "all"
): Promise<void> {
  await ensureSchema();
  if (ids === "all") {
    await cloudPool().query(
      "UPDATE notifications SET read = true WHERE user_id = $1 AND read = false",
      [userId]
    );
    return;
  }
  if (ids.length === 0) return;
  await cloudPool().query(
    "UPDATE notifications SET read = true WHERE user_id = $1 AND id = ANY($2)",
    [userId, ids]
  );
}
