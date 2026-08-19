"use client";

import { CaretUpDown, Check, Gear, Plus, UsersThree } from "@phosphor-icons/react";
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
  const { data } = useSWR<{ workspaces: Ws[] }>(open ? "/api/workspaces" : null, fetcher);
  const workspaces = data?.workspaces ?? [];

  async function switchTo(id: string) {
    if (id === activeId) return setOpen(false);
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
    const r = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((x) => x.json());
    if (r.workspace?.id) await switchTo(r.workspace.id);
  }

  return (
    <div className="relative px-3 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FFEB02] text-[10px] font-bold text-black">
          {(activeName ?? "P").slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{activeName ?? "Personal"}</span>
        <CaretUpDown size={14} className="shrink-0 text-neutral-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="max-h-64 overflow-y-auto py-1">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => switchTo(w.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
                  {w.id === activeId && <Check size={14} className="text-[#a07a00] dark:text-[#FFEB02]" />}
                </button>
              ))}
              {workspaces.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-400">Loading…</div>
              )}
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={create}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Plus size={14} /> New workspace
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
