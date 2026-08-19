"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Board, { DashboardProps } from "@/components/board";
import type { SavedConnectionRawLocalStorage } from "@/app/(theme)/connect/saved-connection-storage";
import LocalBoardSource from "@/drivers/board-source/local";
import CloudBoardStorage from "@/drivers/board-storage/cloud";
import { CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";
import NavigationLayout from "../../nav-layout";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface NavConn {
  id: string;
  name: string;
  driver: string;
}

export default function BoardEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: boardResp } = useSWR<{ board?: { name: string; data: Record<string, unknown> } }>(
    `/api/boards/${id}`,
    fetcher
  );
  const { data: conns } = useSWR<{ connections: NavConn[] }>("/api/db", fetcher);

  const [value, setValue] = useState<DashboardProps | null>(null);
  const [filterValue, setFilterValue] = useState<Record<string, string>>({});
  const [refreshInterval, setRefreshInterval] = useState(0);

  // Hydrate the board value once, tolerating a partially-shaped stored blob.
  useEffect(() => {
    if (value || !boardResp?.board) return;
    const d = (boardResp.board.data ?? {}) as Partial<DashboardProps>;
    setValue({
      name: boardResp.board.name,
      charts: d.charts ?? [],
      layout: d.layout ?? [],
      data: { filters: d.data?.filters ?? [] },
    });
  }, [boardResp, value]);

  const sources = useMemo(() => {
    const list = (conns?.connections ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      driver: c.driver,
      // vault_id makes the proxy query by connection id (password stays server-side).
      vault_id: c.id,
    }));
    return new LocalBoardSource(list as unknown as SavedConnectionRawLocalStorage[]);
  }, [conns]);

  const storage = useMemo(() => new CloudBoardStorage(id), [id]);

  // Persist layout/filter changes (which flow through onChange, not storage.save).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = (v: DashboardProps) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch(`/api/boards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: v, name: v.name }),
      }).catch(() => {});
    }, 500);
  };

  // Gate the board render until BOTH the board and its connections have loaded —
  // charts resolve their source at render time, so an empty source list would
  // throw "Source does not exist" and crash the tree.
  if (!value || !conns) {
    return (
      <NavigationLayout>
        <div className="p-8 text-sm text-neutral-500">Loading board…</div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <Link
          href="/boards"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <CaretLeft size={14} /> Boards
        </Link>
        <input
          value={value.name}
          onChange={(e) => {
            const v = { ...value, name: e.target.value };
            setValue(v);
            persist(v);
          }}
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-semibold outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800"
        />
      </div>
      <Board
        value={value}
        sources={sources}
        storage={storage}
        interval={refreshInterval}
        onChangeInterval={setRefreshInterval}
        filterValue={filterValue}
        onFilterValueChange={setFilterValue}
        onChange={(v) => {
          setValue(v);
          persist(v);
        }}
      />
    </NavigationLayout>
  );
}
