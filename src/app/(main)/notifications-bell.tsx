"use client";

import { Bell } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import type { Notification } from "@/lib/schedules";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/** Cloud-only alert inbox. Polls for unread alerts raised by scheduled queries. */
export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR<{ notifications: Notification[]; unread: number }>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 20000 }
  );
  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    mutate();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        title="Alerts"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFEB02] px-1 text-[10px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Fixed (not absolute) so it escapes the sidebar's overflow-hidden clip. */}
          <div className="fixed top-14 left-3 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-sm font-medium">Alerts</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-[#a07a00] hover:underline dark:text-[#FFEB02]">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-neutral-500">
                  No alerts yet.
                </div>
              )}
              {items.map((n) => (
                <Link
                  key={n.id}
                  href="/schedules"
                  onClick={() => setOpen(false)}
                  className={
                    "block border-b border-neutral-100 px-3 py-2.5 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40 " +
                    (n.read ? "" : "bg-[#FFEB02]/5")
                  }
                >
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFEB02]" />}
                    <span className="truncate text-sm font-medium">{n.title}</span>
                  </div>
                  {n.body && <p className="mt-0.5 pl-3.5 text-xs text-neutral-500">{n.body}</p>}
                  <p className="mt-0.5 pl-3.5 text-[11px] text-neutral-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
