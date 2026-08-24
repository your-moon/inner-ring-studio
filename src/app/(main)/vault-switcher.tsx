"use client";

import { CaretUpDown, Check, Gear, Plus, Vault } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface VaultRow {
  id: string;
  name: string;
  dir: string;
  repoUrl?: string;
  active: boolean;
}

interface VaultsResponse {
  enabled?: boolean;
  vaults: VaultRow[];
}

/**
 * Active vault-workspace picker for desktop / self-hosted, mirroring the cloud
 * WorkspaceSwitcher. Each vault is its own local git-vault; switching changes
 * which one the server reads, so we reload to re-run every vault-scoped fetch.
 */
export default function VaultSwitcher() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR<VaultsResponse>("/api/vaults", fetcher);
  const vaults = data?.vaults ?? [];
  const active = vaults.find((v) => v.active);

  async function post(body: Record<string, unknown>) {
    return fetch("/api/vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  }

  async function switchTo(id: string) {
    if (active?.id === id) return setOpen(false);
    setBusy(true);
    await post({ action: "switch", id });
    // Reload so every vault-scoped fetch (connections, boards, …) re-runs.
    window.location.reload();
  }

  async function create() {
    const name = window.prompt("New vault name")?.trim();
    if (!name) return;
    setBusy(true);
    const r = await post({ action: "add", name, mode: "create" });
    if (r?.id) await switchTo(r.id);
    else {
      setBusy(false);
      mutate();
      if (r?.error) window.alert(r.error);
    }
  }

  // Registry not in use (vault pinned via PMSQL_VAULT) — no switcher. Also stay
  // hidden until the first response so it never flashes on a pinned server.
  if (!data || data.enabled === false) return null;

  return (
    <div className="relative px-3 pb-2">
      <button
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="u-smooth hover:bg-secondary flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] disabled:opacity-60"
      >
        <span className="border-border bg-background flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[9px] font-semibold">
          {(active?.name ?? "V").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {active?.name ?? "Default"}
        </span>
        <CaretUpDown size={12} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border bg-popover absolute right-3 left-3 z-50 mt-1 overflow-hidden rounded-lg border shadow-lg">
            <div className="max-h-64 overflow-y-auto py-1">
              {vaults.map((v) => (
                <button
                  key={v.id}
                  onClick={() => switchTo(v.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Vault size={14} className="shrink-0 text-neutral-400" />
                  <span className="min-w-0 flex-1 truncate">
                    {v.name}
                    {v.repoUrl && (
                      <span className="ml-1 text-xs text-neutral-400">synced</span>
                    )}
                  </span>
                  {v.active && (
                    <Check size={14} className="text-primary" />
                  )}
                </button>
              ))}
              {vaults.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-400">Loading…</div>
              )}
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={create}
                disabled={busy}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
              >
                <Plus size={14} /> New vault
              </button>
              <Link
                href="/vault-storage"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Gear size={14} /> Manage vaults
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
