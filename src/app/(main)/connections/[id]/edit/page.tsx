"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavigationLayout from "../../../nav-layout";

interface Fields {
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  folder: string;
  timezone: string;
  readOnly: boolean;
}

const empty: Fields = {
  name: "",
  host: "",
  port: "5432",
  database: "",
  user: "",
  password: "",
  ssl: false,
  folder: "",
  timezone: "",
  readOnly: false,
};

export default function EditConnectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<Fields>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((j) => {
        const c = (j.connections ?? []).find(
          (x: { id: string }) => x.id === id
        );
        if (c)
          setF({
            name: c.name ?? "",
            host: c.host ?? "",
            port: String(c.port ?? "5432"),
            database: c.database ?? "",
            user: c.user ?? "",
            password: "",
            ssl: !!c.ssl,
            folder: c.folder ?? "",
            timezone: c.timezone ?? "",
            readOnly: !!c.readOnly,
          });
      });
  }, [id]);

  const set = (k: keyof Fields, v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/connections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...f, port: Number(f.port) }),
    });
    const j = await res.json();
    setBusy(false);
    if (res.ok) router.push("/connections");
    else setError(j.error || "Failed to save");
  }

  const input =
    "w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950";

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-lg p-8">
        <h1 className="mb-6 text-xl font-bold">Edit connection</h1>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Host</label>
              <input className={input} value={f.host} onChange={(e) => set("host", e.target.value)} />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm font-medium">Port</label>
              <input className={input} value={f.port} onChange={(e) => set("port", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Database</label>
              <input className={input} value={f.database} onChange={(e) => set("database", e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">User</label>
              <input className={input} value={f.user} onChange={(e) => set("user", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Password <span className="font-normal text-neutral-400">(leave blank to keep)</span>
            </label>
            <input type="password" className={input} value={f.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Folder</label>
              <input className={input} value={f.folder} onChange={(e) => set("folder", e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Timezone</label>
              <input className={input} placeholder="Asia/Ulaanbaatar" value={f.timezone} onChange={(e) => set("timezone", e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.ssl} onChange={(e) => set("ssl", e.target.checked)} className="h-4 w-4 accent-blue-600" />
            Use SSL
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.readOnly} onChange={(e) => set("readOnly", e.target.checked)} className="h-4 w-4 accent-blue-600" />
            Read-only (block all writes)
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => router.push("/connections")}
              className="rounded-lg border border-input px-4 py-2 text-sm dark:border-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}
