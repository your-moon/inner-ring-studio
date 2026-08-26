"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavigationLayout from "../../nav-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/orbit/button";
import { Checkbox } from "@/components/orbit/checkbox";
import { cn } from "@/lib/utils";

interface Importable {
  id: string;
  name: string;
  driver: string;
  workspaceName: string;
}

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
  environment: "" | "staging" | "production";
  folder: string;
}

const DEFAULT_PORT: Record<Driver, string> = {
  postgres: "5432",
  mysql: "3306",
  clickhouse: "8123",
};

/** Turn a raw driver error into something a person can act on. */
function humanizeConnError(raw: string, host: string, port: string): string {
  const m = (raw || "").toLowerCase();
  const at = `${host || "the host"}${port ? ":" + port : ""}`;
  if (m.includes("econnrefused"))
    return `Couldn't reach the database at ${at} — is it running and accepting connections from here?`;
  if (m.includes("enotfound") || m.includes("eai_again") || m.includes("getaddrinfo"))
    return `Host "${host}" not found — check the host name.`;
  if (m.includes("etimedout") || m.includes("timeout"))
    return `Connection to ${at} timed out — the host may be unreachable or behind a firewall.`;
  if (
    m.includes("password authentication failed") ||
    m.includes("access denied") ||
    m.includes("authentication failed")
  )
    return "Authentication failed — check the user name and password.";
  if (m.includes("does not exist") && m.includes("database"))
    return "That database doesn't exist — check the database name.";
  if (
    m.includes("self-signed") ||
    m.includes("self signed") ||
    m.includes("certificate") ||
    m.includes("ssl")
  )
    return "SSL/certificate error — try toggling “Use SSL”.";
  return raw || "Connection failed.";
}

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
    environment: "",
    folder: "",
  });
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<null | { ok: boolean; msg: string }>(
    null
  );

  // Connections in the caller's OTHER workspaces — importable into this one.
  const [importable, setImportable] = useState<Importable[]>([]);
  const [importSel, setImportSel] = useState("");
  useEffect(() => {
    fetch("/api/connections/import")
      .then((r) => r.json())
      .then((j) => setImportable(j.connections ?? []))
      .catch(() => {});
  }, []);

  async function importConn() {
    if (!importSel) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/connections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: importSel }),
      });
      const j = await res.json();
      if (res.ok && j.connection) router.push(`/vault/${j.connection.id}`);
      else setError(j.error || "Failed to import");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

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
        setTestResult({
          ok: false,
          msg: humanizeConnError(j.error || `Failed (${res.status})`, f.host, f.port),
        });
      }
    } catch (e) {
      setTestResult({
        ok: false,
        msg: humanizeConnError((e as Error).message, f.host, f.port),
      });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setSaving(true);
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
          environment: f.environment || undefined,
          folder: f.folder || undefined,
        }),
      });
      const j = await res.json();
      if (res.ok && j.connection) {
        router.push(`/vault/${j.connection.id}`);
      } else {
        setError(humanizeConnError(j.error || "Failed to save", f.host, f.port));
      }
    } catch (e) {
      setError(humanizeConnError((e as Error).message, f.host, f.port));
    } finally {
      setBusy(false);
      setSaving(false);
    }
  }

  /** Parse a `postgres://user:pass@host:port/db` URL and fill the form. */
  function applyConnectionString(raw: string) {
    const s = raw.trim();
    if (!s) return;
    try {
      const u = new URL(s.replace(/^jdbc:/, ""));
      const proto = u.protocol.replace(":", "").toLowerCase();
      const driver: Driver | null =
        proto.startsWith("postgres")
          ? "postgres"
          : proto.startsWith("mysql")
            ? "mysql"
            : proto.startsWith("clickhouse") || proto.startsWith("http")
              ? "clickhouse"
              : null;
      setF((prev) => {
        const nextDriver = driver ?? prev.driver;
        return {
          ...prev,
          driver: nextDriver,
          host: u.hostname || prev.host,
          port: u.port || DEFAULT_PORT[nextDriver],
          database: decodeURIComponent(u.pathname.replace(/^\//, "")) || prev.database,
          user: decodeURIComponent(u.username) || prev.user,
          password: decodeURIComponent(u.password) || prev.password,
          ssl:
            u.searchParams.get("sslmode") === "require" ||
            u.searchParams.get("ssl") === "true" ||
            prev.ssl,
        };
      });
      setError("");
    } catch {
      setError("That doesn't look like a valid connection URL.");
    }
  }

  const driverBtn = (d: Driver, label: string) => (
    <Button
      variant="secondary"
      size="lg"
      toggled={f.driver === d}
      className={cn("flex-1", f.driver === d && "!bg-primary/10 [color:var(--primary)]")}
      onClick={() => setDriver(d)}
    >
      {label}
    </Button>
  );

  const canSave = f.name.trim() && f.host.trim() && f.port.trim();

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-lg p-8">
        <h1 className="mb-1 text-[19px] font-semibold tracking-tight text-foreground">
          New connection
        </h1>
        <p className="mb-6 text-[13px] text-muted-foreground">
          Connect to your own database. Credentials are stored encrypted in the vault.
        </p>

        {importable.length > 0 && (
          <div className="mb-6 rounded-lg border border-border bg-secondary/40 p-4">
            <label className="mb-1 block text-[13px] font-medium text-foreground">
              Import from another workspace
            </label>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Copy a connection you already have — credentials come along, no
              retyping.
            </p>
            <div className="flex gap-2">
              <select
                className="irs-select h-9 flex-1 rounded-md border border-input bg-card px-3 text-[14px] text-foreground outline-none u-smooth focus:border-ring focus:ring-2 focus:ring-ring/40"
                value={importSel}
                onChange={(e) => setImportSel(e.target.value)}
              >
                <option value="">Choose a connection…</option>
                {Array.from(new Set(importable.map((c) => c.workspaceName))).map(
                  (ws) => (
                    <optgroup key={ws} label={ws}>
                      {importable
                        .filter((c) => c.workspaceName === ws)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.driver})
                          </option>
                        ))}
                    </optgroup>
                  )
                )}
              </select>
              <Button
                variant="secondary"
                size="lg"
                onClick={importConn}
                disabled={busy || !importSel}
              >
                Import
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Paste a connection URL{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <Input
              
              placeholder="postgres://user:pass@host:5432/dbname"
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (/^\w+:\/\//.test(text.trim())) {
                  e.preventDefault();
                  applyConnectionString(text);
                  e.currentTarget.value = "";
                }
              }}
              onChange={(e) => {
                if (/^\w+:\/\//.test(e.target.value.trim())) {
                  applyConnectionString(e.target.value);
                  e.currentTarget.value = "";
                }
              }}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Paste a database URL and we&apos;ll fill in the fields below.
            </p>
          </div>

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
            <Input
              
              placeholder="e.g. Production"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Host</label>
              <Input
                
                placeholder="db.example.com"
                value={f.host}
                onChange={(e) => set("host", e.target.value)}
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium">Port</label>
              <Input
                
                value={f.port}
                onChange={(e) => set("port", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Database</label>
              <Input
                
                value={f.database}
                onChange={(e) => set("database", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">User</label>
              <Input
                
                value={f.user}
                onChange={(e) => set("user", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <Input
              type="password"
              
              value={f.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Folder <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <Input
              
              placeholder="e.g. VMS"
              value={f.folder}
              onChange={(e) => set("folder", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Environment{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              {(
                [
                  ["", "None"],
                  ["staging", "Staging"],
                  ["production", "Production"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    set("environment", value);
                    // Marking a target as production defaults it to read-only;
                    // the checkbox below stays free to override.
                    if (value === "production" && !f.readOnly)
                      set("readOnly", true);
                  }}
                  className={
                    "px-3 py-1.5 text-[13px] transition-colors " +
                    (f.environment === value
                      ? value === "production"
                        ? "bg-amber-50 font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-400"
                        : "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {f.environment === "production" && (
              <p className="mt-1.5 text-[12px] text-amber-700 dark:text-amber-400">
                Marked as production: writes will ask for confirmation, and the
                connection carries a prod badge everywhere it appears.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={f.ssl}
              onCheckedChange={(v) => set("ssl", v === true)}
            />
            Use SSL
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={f.readOnly}
              onCheckedChange={(v) => set("readOnly", v === true)}
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
            <Button
              variant="secondary"
              size="lg"
              onClick={testConnection}
              disabled={busy || !f.host.trim()}
              loading={busy && !saving}
              loadingLabel="Testing connection"
            >
              Test connection
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={save}
              disabled={busy || !canSave}
              loading={saving}
              loadingLabel="Saving"
            >
              Save &amp; connect
            </Button>
            <Button variant="ghost" size="lg" onClick={() => router.push("/local")}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}
