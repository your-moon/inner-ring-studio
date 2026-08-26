"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/orbit";
import { Check, ChevronsUpDown, Plus, Settings, Vault } from "lucide-react";
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
    if (active?.id === id) return;
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
    <div className="px-2 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          className="focus-ring hover:bg-surface-hover data-[state=open]:bg-surface-hover text-ui-small flex h-8 w-full items-center gap-2 rounded-[var(--radius-control)] px-2 text-left disabled:opacity-60"
        >
          <span className="border-border-default bg-surface-panel grid size-5 shrink-0 place-items-center rounded-[var(--radius-small)] border text-[10px] font-semibold [color:var(--content-primary)]">
            {(active?.name ?? "V").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate font-[var(--weight-medium)] [color:var(--content-primary)]">
            {active?.name ?? "Default"}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[236px]">
          {vaults.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onSelect={() => switchTo(v.id)}
              className="flex items-center gap-2"
            >
              <Vault className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
              <span className="min-w-0 flex-1 truncate">
                {v.name}
                {v.repoUrl ? (
                  <span className="text-ui-caption ml-1 [color:var(--content-tertiary)]">
                    synced
                  </span>
                ) : null}
              </span>
              {v.active ? (
                <Check className="size-3.5 shrink-0 [color:var(--content-link)]" />
              ) : null}
            </DropdownMenuItem>
          ))}
          {vaults.length === 0 ? (
            <div className="text-ui-caption px-2 py-1.5 [color:var(--content-tertiary)]">
              Loading…
            </div>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={create} disabled={busy} className="flex items-center gap-2">
            <Plus className="size-3.5 shrink-0" /> New vault
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="flex items-center gap-2">
            <Link href="/vault-storage">
              <Settings className="size-3.5 shrink-0" /> Manage vaults
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
