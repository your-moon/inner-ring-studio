"use client";

import { ChartBar, Trash, UploadSimple, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface BoardSummary {
  id: string;
  name: string;
  updatedAt: number;
}

const yellowBtn =
  "rounded-lg press bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50";

export default function BoardsPage() {
  const router = useRouter();
  const { data, mutate } = useSWR<{ boards: BoardSummary[] }>("/api/boards", fetcher);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
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
          <div className="flex gap-2">
            <button
              onClick={() => setImporting(true)}
              className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <UploadSimple size={15} /> Import JSON
            </button>
            <button className={yellowBtn} disabled={creating} onClick={createBoard}>
              {creating ? "Creating…" : "New board"}
            </button>
          </div>
        </div>
        {importing && (
          <ImportDialog
            onClose={() => setImporting(false)}
            onImported={(id) => router.push(`/boards/${id}`)}
          />
        )}
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
                  <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-secondary/50">
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

function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setText(t);
    if (!name) setName(f.name.replace(/\.json$/i, ""));
  }

  async function doImport() {
    setError("");
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("not an object");
    } catch (err) {
      setError("Invalid JSON: " + (err as Error).message);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, data }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.board?.id) onImported(j.board.id);
    else setError(j.error || "Import failed.");
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-[min(90vw,560px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="text-sm font-semibold">Import board from JSON</div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name (optional)"
              className="flex-1 rounded-lg border border-input px-3 py-2 text-sm outline-none bg-card u-smooth focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Upload .json
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder="Paste the dashboard JSON here…"
            className="h-56 resize-none rounded-lg border border-input bg-neutral-50 p-3 font-mono text-[12.5px] outline-none bg-card u-smooth focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-500">
              Cancel
            </button>
            <button
              onClick={doImport}
              disabled={busy || !text.trim()}
              className="rounded-lg press bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
