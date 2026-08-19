"use client";

import { ChartBar, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface BoardSummary {
  id: string;
  name: string;
  updatedAt: number;
}

const yellowBtn =
  "rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00] disabled:opacity-50";

export default function BoardsPage() {
  const router = useRouter();
  const { data, mutate } = useSWR<{ boards: BoardSummary[] }>("/api/boards", fetcher);
  const [creating, setCreating] = useState(false);
  const boards = data?.boards ?? [];

  async function createBoard() {
    setCreating(true);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled board" }),
    });
    const j = await res.json().catch(() => ({}));
    setCreating(false);
    if (j.board?.id) router.push(`/boards/${j.board.id}`);
  }

  async function del(id: string, name: string) {
    if (!window.confirm(`Delete board "${name}"?`)) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-4xl p-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold">Boards</h1>
          <button className={yellowBtn} disabled={creating} onClick={createBoard}>
            {creating ? "Creating…" : "New board"}
          </button>
        </div>
        <p className="mb-6 text-sm text-neutral-500">
          Live dashboards built from your queries. Charts refresh on their own and
          are shared across your workspace.
        </p>

        {boards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
            <ChartBar size={28} className="mx-auto text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">
              No boards yet. Create one and add a chart from any query.
            </p>
            <button className={yellowBtn + " mt-4"} onClick={createBoard}>
              New board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <div
                key={b.id}
                className="group relative rounded-xl border border-neutral-200 transition-colors hover:border-[#e6d400] dark:border-neutral-800"
              >
                <Link href={`/boards/${b.id}`} className="block p-5">
                  <div className="flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-[#FFEB02]/10 to-transparent">
                    <ChartBar size={30} className="text-[#c9b400]" weight="duotone" />
                  </div>
                  <div className="mt-3 truncate font-medium">{b.name}</div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    Updated {new Date(b.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
                <button
                  onClick={() => del(b.id, b.name)}
                  title="Delete board"
                  className="absolute top-3 right-3 rounded-md p-1.5 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}
