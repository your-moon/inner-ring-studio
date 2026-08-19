"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import NavigationLayout from "../../nav-layout";

type Driver = "postgres" | "mysql" | "clickhouse";

interface Fields {
  driver: Driver;
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  readOnly: boolean;
  folder: string;
}

const DEFAULT_PORT: Record<Driver, string> = {
  postgres: "5432",
  mysql: "3306",
  clickhouse: "8123",
};

export default function NewConnectionPage() {
  const router = useRouter();
  const [f, setF] = useState<Fields>({
    driver: "postgres",
    name: "",
    host: "",
    port: "5432",
    database: "",
    user: "",
    password: "",
    ssl: false,
    readOnly: false,
    folder: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(
    null
  );

  const set = (k: keyof Fields, v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const setDriver = (d: Driver) =>
    setF((prev) => ({
      ...prev,
      driver: d,
      // Only auto-fill the port if it's still a default (don't clobber a typed one).
      port:
        prev.port === "" || prev.port === DEFAULT_PORT[prev.driver]
          ? DEFAULT_PORT[d]
          : prev.port,
    }));

  const connectionBody = () => ({
    driver: f.driver,
    host: f.host,
    port: Number(f.port),
    database: f.database || undefined,
    user: f.user || undefined,
    password: f.password || undefined,
    ssl: f.ssl,
  });

  async function testConnection() {
    setBusy(true);
    setTestResult(null);
    setError("");
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection: connectionBody(), sql: "SELECT 1" }),
      });
      const j = await res.json();
      if (res.ok && !j.error) {
        setTestResult({ ok: true, msg: "Connected successfully." });
      } else {
        setTestResult({ ok: false, msg: j.error || `Failed (${res.status})` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          driver: f.driver,
          host: f.host,
          port: Number(f.port),
          database: f.database,
          user: f.user,
          password: f.password,
          ssl: f.ssl,
          readOnly: f.readOnly,
          folder: f.folder || undefined,
        }),
      });
      const j = await res.json();
      if (res.ok && j.connection) {
        router.push(`/vault/${j.connection.id}`);
      } else {
        setError(j.error || "Failed to save");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#e0cf00] dark:border-neutral-700 dark:bg-neutral-950";

  const driverBtn = (d: Driver, label: string) => (
    <button
      type="button"
      onClick={() => setDriver(d)}
      className={
        "flex-1 rounded-lg border px-4 py-2 text-sm font-medium " +
        (f.driver === d
          ? "border-[#e0cf00] bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300"
          : "border-neutral-300 dark:border-neutral-700")
      }
    >
      {label}
    </button>
  );

  const canSave = f.name.trim() && f.host.trim() && f.port.trim();

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-lg p-8">
        <h1 className="mb-1 text-xl font-bold">New connection</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Connect to your own database. Credentials are stored encrypted in the vault.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Database type</label>
            <div className="flex gap-2">
              {driverBtn("postgres", "PostgreSQL")}
              {driverBtn("mysql", "MySQL")}
              {driverBtn("clickhouse", "ClickHouse")}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className={input}
              placeholder="e.g. Production"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Host</label>
              <input
                className={input}
                placeholder="db.example.com"
                value={f.host}
                onChange={(e) => set("host", e.target.value)}
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium">Port</label>
              <input
                className={input}
                value={f.port}
                onChange={(e) => set("port", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Database</label>
              <input
                className={input}
                value={f.database}
                onChange={(e) => set("database", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">User</label>
              <input
                className={input}
                value={f.user}
                onChange={(e) => set("user", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              className={input}
              value={f.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Folder <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <input
              className={input}
              placeholder="e.g. VMS"
              value={f.folder}
              onChange={(e) => set("folder", e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.ssl}
              onChange={(e) => set("ssl", e.target.checked)}
              className="h-4 w-4 accent-[#e0cf00]"
            />
            Use SSL
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.readOnly}
              onChange={(e) => set("readOnly", e.target.checked)}
              className="h-4 w-4 accent-[#e0cf00]"
            />
            Read-only (block all writes) — recommended for production
          </label>

          {testResult && (
            <p
              className={
                "text-sm " +
                (testResult.ok ? "text-green-600" : "text-red-600")
              }
            >
              {testResult.ok ? "✓ " : "✕ "}
              {testResult.msg}
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={testConnection}
              disabled={busy || !f.host.trim()}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {busy ? "Testing…" : "Test connection"}
            </button>
            <button
              onClick={save}
              disabled={busy || !canSave}
              className="rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00] disabled:opacity-50"
            >
              Save & connect
            </button>
            <button
              onClick={() => router.push("/local")}
              className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}
