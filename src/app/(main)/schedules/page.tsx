"use client";

import { useState } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";
import type { Schedule, ScheduleRun } from "@/lib/schedules";
import type { AlertOp } from "@/lib/query-runner";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const OP_LABEL: Record<AlertOp, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  ne: "≠",
  changed: "changed",
};

const yellowBtn =
  "rounded-lg press bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50";
const input =
  "w-full rounded-lg border border-input px-3 py-2 text-sm outline-none bg-card u-smooth focus:border-ring focus:ring-2 focus:ring-ring/40";

function rel(ts: number | null): string {
  if (ts == null) return "—";
  const d = ts - Date.now();
  const abs = Math.abs(d);
  const m = Math.round(abs / 60000);
  const unit = m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  return d >= 0 ? `in ${unit}` : `${unit} ago`;
}

export default function SchedulesPage() {
  const { data, mutate } = useSWR<{ schedules: Schedule[] }>("/api/schedules", fetcher, {
    refreshInterval: 15000,
  });
  const { data: conns } = useSWR<{ connections: { id: string; name: string; driver: string }[] }>(
    "/api/db",
    fetcher
  );
  const [creating, setCreating] = useState(false);

  const schedules = data?.schedules ?? [];
  const connections = conns?.connections ?? [];

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-3xl p-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold">Scheduled queries</h1>
          {!creating && (
            <button className={yellowBtn} onClick={() => setCreating(true)}>
              New schedule
            </button>
          )}
        </div>
        <p className="mb-6 text-sm text-neutral-500">
          Run a query on a schedule and get alerted when a threshold trips. Runs
          in the cloud, so it fires whether or not your machine is on.
        </p>

        {creating && (
          <CreateForm
            connections={connections}
            onCancel={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              mutate();
            }}
          />
        )}

        {schedules.length === 0 && !creating && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No scheduled queries yet. Create one to watch a metric automatically.
          </div>
        )}

        <div className="space-y-3">
          {schedules.map((s) => (
            <ScheduleCard key={s.id} s={s} onChange={mutate} />
          ))}
        </div>
      </div>
    </NavigationLayout>
  );
}

function CreateForm({
  connections,
  onCancel,
  onCreated,
}: {
  connections: { id: string; name: string; driver: string }[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [sql, setSql] = useState("");
  const [intervalMin, setIntervalMin] = useState(60);
  const [metric, setMetric] = useState<"rowcount" | "value">("rowcount");
  const [op, setOp] = useState<AlertOp | "">("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        connectionId,
        sql,
        intervalMin,
        alertMetric: metric,
        alertOp: op || null,
        alertValue: op && op !== "changed" ? Number(value) : null,
      }),
    });
    setBusy(false);
    if (res.ok) onCreated();
    else setError((await res.json().catch(() => ({}))).error || "Could not create schedule.");
  }

  const needsValue = op !== "" && op !== "changed";
  const canSave =
    name.trim() && connectionId && sql.trim() && intervalMin >= 1 && (!needsValue || value !== "");

  return (
    <div className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 font-medium">New scheduled query</div>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input className={input} placeholder="e.g. Failed payments today" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="w-56">
            <label className="mb-1 block text-sm font-medium">Connection</label>
            <select className={input + " irs-select"} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
              {connections.length === 0 && <option value="">No connections</option>}
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">SQL</label>
          <textarea
            className={input + " min-h-[90px] font-mono text-[13px]"}
            placeholder="SELECT count(*) FROM payments WHERE status = 'failed' AND created_at > now() - interval '1 day'"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="mb-1 block text-sm font-medium">Every</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className={input}
                value={intervalMin}
                onChange={(e) => setIntervalMin(Number(e.target.value))}
              />
              <span className="text-sm text-neutral-500">min</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/50">
          <div className="mb-2 text-sm font-medium">Alert (optional)</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500">Notify me when</span>
            <select style={{ width: "9.5rem" }} className={input + " irs-select"} value={metric} onChange={(e) => setMetric(e.target.value as "rowcount" | "value")}>
              <option value="rowcount">row count</option>
              <option value="value">first value</option>
            </select>
            <select style={{ width: "7.5rem" }} className={input + " irs-select"} value={op} onChange={(e) => setOp(e.target.value as AlertOp | "")}>
              <option value="">— no alert —</option>
              {(Object.keys(OP_LABEL) as AlertOp[]).map((o) => (
                <option key={o} value={o}>
                  {OP_LABEL[o]}
                </option>
              ))}
            </select>
            {needsValue && (
              <input
                type="number"
                style={{ width: "6.5rem" }}
                className={input}
                placeholder="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className={yellowBtn} disabled={busy || !canSave} onClick={submit}>
            {busy ? "Creating…" : "Create schedule"}
          </button>
          <button className="rounded-lg px-4 py-2 text-sm text-neutral-500" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ s, onChange }: { s: Schedule; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ runs: ScheduleRun[] }>(open ? `/api/schedules/${s.id}` : null, fetcher);

  async function toggle() {
    await fetch(`/api/schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    onChange();
  }
  async function del() {
    if (!window.confirm(`Delete schedule "${s.name}"?`)) return;
    await fetch(`/api/schedules/${s.id}`, { method: "DELETE" });
    onChange();
  }

  const alertText =
    s.alertOp == null
      ? "no alert"
      : `${s.alertMetric === "rowcount" ? "rows" : "value"} ${OP_LABEL[s.alertOp]}${s.alertOp !== "changed" ? " " + s.alertValue : ""}`;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 p-4">
        <span
          className={
            "h-2 w-2 shrink-0 rounded-full " +
            (s.enabled ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-600")
          }
          title={s.enabled ? "Enabled" : "Paused"}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{s.name}</div>
          <div className="mt-0.5 text-xs text-neutral-500">
            every {s.intervalMin}m · {alertText} · next {rel(s.nextRunAt)} · last {rel(s.lastRunAt)}
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          {open ? "Hide" : "History"}
        </button>
        <button onClick={toggle} className="rounded-md border border-input px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {s.enabled ? "Pause" : "Resume"}
        </button>
        <button onClick={del} className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          Delete
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          {!data && <div className="text-xs text-neutral-500">Loading runs…</div>}
          {data && data.runs.length === 0 && (
            <div className="text-xs text-neutral-500">No runs yet — the first is due {rel(s.nextRunAt)}.</div>
          )}
          <div className="space-y-1.5">
            {data?.runs.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className={"font-mono " + (r.status === "ok" ? "text-neutral-500" : "text-red-600")}>
                  {new Date(r.ranAt).toLocaleString()}
                </span>
                {r.status === "ok" ? (
                  <>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {r.rowCount} rows{r.metricVal != null ? ` · metric ${r.metricVal}` : ""}
                    </span>
                    {r.alerted && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">alerted</span>
                    )}
                  </>
                ) : (
                  <span className="text-red-600">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
