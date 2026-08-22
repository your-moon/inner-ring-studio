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

/**
 * Active vault-workspace picker for desktop / self-hosted, mirroring the cloud
 * WorkspaceSwitcher. Each vault is its own local git-vault; switching changes
 * which one the server reads, so we reload to re-run every vault-scoped fetch.
 */
export default function VaultSwitcher() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR<{ vaults: VaultRow[] }>("/api/vaults", fetcher);
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

  return (
    <div className="relative px-3 pb-2">
      <button
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-neutral-300 text-[10px] font-bold dark:border-neutral-700">
          {(active?.name ?? "V").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {active?.name ?? "Default"}
        </span>
        <CaretUpDown size={14} className="shrink-0 text-neutral-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
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
                    <Check size={14} className="text-[#a07a00] dark:text-[#FFEB02]" />
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
