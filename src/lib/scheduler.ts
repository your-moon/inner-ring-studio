import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";
import { decryptSecret } from "./crypto";
import type { PgConnConfig } from "./pg-pool";
import {
  evalAlert,
  extractMetric,
  runQuery,
  snapshot,
  type AlertOp,
  type RunnerDriver,
} from "./query-runner";

/**
 * Cloud-only background scheduler. A single in-process ticker (one per app
 * container) wakes every minute, claims any due schedules, runs each against
 * its own connection, records the run, and raises an in-app notification when
 * the alert rule trips. Desktop/self-hosted never start this (guarded by
 * DEPLOY_MODE=cloud at the register() call site).
 *
 * Claiming is atomic (advance next_run_at in the same UPDATE that selects the
 * row), so overlapping ticks — or a second process — never double-run a query.
 */

const TICK_MS = 60_000;
const BATCH = 25;

interface DueRow {
  id: string;
  user_id: string;
  name: string;
  sql: string;
  alert_metric: "rowcount" | "value";
  alert_op: string | null;
  alert_value: number | null;
  last_metric: number | null;
  driver: string;
  host: string;
  port: number;
  database: string | null;
  db_user: string | null;
  password_enc: string | null;
  ssl: boolean;
  read_only: boolean;
  timezone: string | null;
}

function cfgOf(r: DueRow): PgConnConfig {
  return {
    host: r.host,
    port: r.port,
    database: r.database ?? undefined,
    user: r.db_user ?? undefined,
    password: r.password_enc ? decryptSecret(r.password_enc) : undefined,
    ssl: r.ssl,
    readOnly: r.read_only,
    timezone: r.timezone ?? undefined,
    driver: r.driver,
  };
}

async function runOne(r: DueRow): Promise<void> {
  const runId = cloudNewId();
  const started = Date.now();
  try {
    const result = await runQuery(r.driver as RunnerDriver, cfgOf(r), r.sql);
    const metric = extractMetric(r.alert_metric, result);
    const alerted = evalAlert(
      r.alert_op as AlertOp | null,
      r.alert_value,
      metric,
      r.last_metric
    );
    await cloudPool().query(
      `INSERT INTO schedule_runs (id, sched_id, status, row_count, metric_val, alerted, duration_ms, snapshot)
       VALUES ($1,$2,'ok',$3,$4,$5,$6,$7)`,
      [
        runId,
        r.id,
        result.rowCount,
        Number.isNaN(metric) ? null : metric,
        alerted,
        Date.now() - started,
        JSON.stringify(snapshot(result)),
      ]
    );
    await cloudPool().query(
      "UPDATE scheduled_queries SET last_metric = $1 WHERE id = $2",
      [Number.isNaN(metric) ? null : metric, r.id]
    );
    if (alerted) {
      const metricLabel =
        r.alert_metric === "rowcount" ? "row count" : "value";
      await cloudPool().query(
        `INSERT INTO notifications (id, user_id, kind, title, body, sched_id)
         VALUES ($1,$2,'alert',$3,$4,$5)`,
        [
          cloudNewId(),
          r.user_id,
          `Alert: ${r.name}`,
          `The ${metricLabel} is ${metric} (${opLabel(r.alert_op)} ${r.alert_value ?? ""}).`.trim(),
          r.id,
        ]
      );
    }
  } catch (e) {
    await cloudPool()
      .query(
        `INSERT INTO schedule_runs (id, sched_id, status, duration_ms, error)
         VALUES ($1,$2,'error',$3,$4)`,
        [runId, r.id, Date.now() - started, (e as Error).message.slice(0, 500)]
      )
      .catch(() => {});
  }
}

function opLabel(op: string | null): string {
  switch (op) {
    case "gt":
      return ">";
    case "gte":
      return "≥";
    case "lt":
      return "<";
    case "lte":
      return "≤";
    case "eq":
      return "=";
    case "ne":
      return "≠";
    case "changed":
      return "changed from";
    default:
      return "";
  }
}

async function tick(): Promise<void> {
  await ensureSchema();
  // Claim due schedules one at a time: the UPDATE both selects and advances
  // next_run_at, so a row can only be claimed once even under concurrency.
  for (let i = 0; i < BATCH; i++) {
    const claimed = await cloudPool().query(
      `UPDATE scheduled_queries s
          SET next_run_at = now() + (s.interval_min || ' minutes')::interval,
              last_run_at = now()
        WHERE s.id = (
          SELECT id FROM scheduled_queries
           WHERE enabled AND next_run_at <= now()
           ORDER BY next_run_at
           FOR UPDATE SKIP LOCKED
           LIMIT 1
        )
        RETURNING s.id, s.user_id, s.name, s.sql, s.alert_metric, s.alert_op,
                  s.alert_value, s.last_metric, s.connection_id`
    );
    const claim = claimed.rows[0];
    if (!claim) break; // nothing due
    // Fetch the connection details for this claim.
    const conn = await cloudPool().query(
      `SELECT driver, host, port, database, db_user, password_enc, ssl, read_only, timezone
         FROM connections WHERE id = $1`,
      [claim.connection_id]
    );
    const c = conn.rows[0];
    if (!c) continue; // connection deleted mid-flight
    await runOne({ ...claim, ...c } as DueRow);
  }
}

const g = globalThis as unknown as { __irsSchedulerStarted?: boolean };

/** Start the ticker once per process. No-op if already started. */
export function startScheduler(): void {
  if (g.__irsSchedulerStarted) return;
  g.__irsSchedulerStarted = true;
  let running = false;
  const safeTick = async () => {
    if (running) return; // never overlap ticks in-process
    running = true;
    try {
      await tick();
    } catch {
      // swallow — a bad tick must not crash the server
    } finally {
      running = false;
    }
  };
  // First sweep shortly after boot, then every minute.
  setTimeout(safeTick, 5_000);
  setInterval(safeTick, TICK_MS);
}
