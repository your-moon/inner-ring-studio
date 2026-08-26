"use client";

import { Check, Link, Share2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import OptimizeTableState from "@/components/gui/table-optimized/optimize-table-state";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/**
 * Cloud-only "Share" for a query result: captures the loaded columns + rows into
 * a public snapshot and hands back a login-free link. Renders nothing outside
 * cloud mode.
 */
export default function ShareResultButton({ data }: { data: OptimizeTableState }) {
  const { data: me } = useSWR<{ mode: string }>("/api/auth/me", fetcher);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (me?.mode !== "cloud") return null;

  async function share() {
    setBusy(true);
    const columns = data.getHeaders().map((h) => h.name);
    const rows = data.getAllRows().map((r) => {
      const raw = r.raw as Record<string, unknown>;
      return columns.map((c) => raw[c]);
    });
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Shared result", columns, rows }),
    })
      .then((x) => x.json())
      .catch(() => ({}));
    setBusy(false);
    if (res.token) {
      const link = `${window.location.origin}/s/${res.token}`;
      setUrl(link);
      navigator.clipboard?.writeText(link).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={share}
        disabled={busy}
        title="Share this result as a public link"
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-secondary-foreground hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Share2 size={13} /> {busy ? "Sharing…" : "Share"}
      </button>

      {url && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setUrl(null)} />
          <div className="absolute bottom-full left-0 z-50 mb-1 w-80 rounded-lg border border-border bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Link size={13} /> Public link {copied && <span className="text-green-600">· copied</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded border border-input px-2 py-1 font-mono text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(url).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded bg-[#FFEB02] p-1.5 text-black hover:bg-[#f2df00]"
                title="Copy"
              >
                {copied ? <Check size={13} /> : <Link size={13} />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anyone with this link can view a snapshot of these rows. Revoke it from the Shared list.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
