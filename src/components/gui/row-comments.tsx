"use client";

import { ChatCircle, PaperPlaneRight, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

interface RowComment {
  id: string;
  body: string;
  columnName: string | null;
  authorEmail: string | null;
  createdAt: number;
  mine: boolean;
}

/**
 * Cloud-only comment thread for a single table row. Renders nothing outside
 * cloud mode (the GET reports `cloud:false`), so it's safe to mount anywhere.
 */
export default function RowComments({
  connectionId,
  table,
  rowKey,
}: {
  connectionId: string;
  table: string;
  rowKey: string;
}) {
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [comments, setComments] = useState<RowComment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ connectionId, table, rowKey });
    const r = await fetch(`/api/comments?${q}`)
      .then((x) => x.json())
      .catch(() => ({ cloud: false, comments: [] }));
    setCloud(Boolean(r.cloud));
    setComments(r.comments ?? []);
  }, [connectionId, table, rowKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    const r = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, table, rowKey, body: text }),
    })
      .then((x) => x.json())
      .catch(() => ({}));
    setBusy(false);
    if (r.comment) {
      setComments((c) => [...c, r.comment]);
      setText("");
    }
  }

  async function del(id: string) {
    setComments((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  // Not cloud → render nothing (comments are a Cloud capability).
  if (cloud === false) return null;

  return (
    <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        <ChatCircle size={14} />
        Comments{comments.length ? ` (${comments.length})` : ""}
      </div>

      <div className="space-y-2">
        {comments.map((c) => (
          <div key={c.id} className="group rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500">
                {c.authorEmail ?? "you"} · {new Date(c.createdAt).toLocaleString()}
              </span>
              {c.mine && (
                <button
                  onClick={() => del(c.id)}
                  className="rounded p-1 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                  title="Delete"
                >
                  <Trash size={13} />
                </button>
              )}
            </div>
            <div className="mt-0.5 text-sm whitespace-pre-wrap">{c.body}</div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-neutral-400">No comments on this row yet.</p>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          rows={2}
          placeholder="Add a comment… (⌘↵ to send)"
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#e0cf00] dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          onClick={add}
          disabled={busy || !text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFEB02] text-black hover:bg-[#f2df00] disabled:opacity-50"
          title="Send"
        >
          <PaperPlaneRight size={16} />
        </button>
      </div>
    </div>
  );
}
