"use client";

import { CaretUpDown, Check, CircleNotch, Plus, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface Ws {
  id: string;
  name: string;
  personal: boolean;
  role: string;
  memberCount: number;
}

/** Active-workspace picker + create (cloud only). Sits under the logo. */
export default function WorkspaceSwitcher({
  activeId,
  activeName,
}: {
  activeId: string | null;
  activeName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data } = useSWR<{ workspaces: Ws[] }>(open ? "/api/workspaces" : null, fetcher);
  const workspaces = data?.workspaces ?? [];

  async function switchTo(id: string) {
    if (id === activeId) return setOpen(false);
    setBusy(true);
    await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    });
    // Reload so every workspace-scoped fetch re-runs for the new workspace.
    window.location.reload();
  }

  async function create() {
    const name = window.prompt("New workspace name")?.trim();
    if (!name) return;
    setBusy(true);
    const r = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((x) => x.json());
    if (r.workspace?.id) await switchTo(r.workspace.id);
    else setBusy(false);
  }

  return (
    <div className="relative px-3 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="u-smooth hover:bg-secondary flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px]"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
          {(activeName ?? "P").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{activeName ?? "Personal"}</span>
        <CaretUpDown size={12} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border bg-popover absolute right-3 left-3 z-50 mt-1 overflow-hidden rounded-lg border shadow-lg">
            <div className="max-h-64 overflow-y-auto py-1">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => switchTo(w.id)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {w.name}
                    {w.personal ? (
                      <span className="ml-1 text-xs text-neutral-400">personal</span>
                    ) : (
                      <span className="ml-1 text-xs text-neutral-400">
                        {w.memberCount} · {w.role}
                      </span>
                    )}
                  </span>
                  {w.id === activeId && <Check size={14} className="text-primary" />}
                </button>
              ))}
              {workspaces.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-400">Loading…</div>
              )}
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={create}
                disabled={busy}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
              >
                {busy ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}{" "}
                New workspace
              </button>
              <Link
                href="/workspace"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <UsersThree size={14} /> Members &amp; settings
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
