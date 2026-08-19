"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import type { DashboardProps } from "@/components/board";

/**
 * Grafana-style JSON model: view, edit, copy, or download the whole dashboard
 * as JSON. Applying replaces the board with the parsed value (validated to the
 * DashboardProps shape).
 */
export default function BoardJsonDialog({
  value,
  onApply,
  onClose,
}: {
  value: DashboardProps;
  onApply: (v: DashboardProps) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function parsed(): DashboardProps | null {
    try {
      const v = JSON.parse(text);
      if (!v || typeof v !== "object") throw new Error("not an object");
      return {
        name: typeof v.name === "string" ? v.name : value.name,
        charts: Array.isArray(v.charts) ? v.charts : [],
        layout: Array.isArray(v.layout) ? v.layout : [],
        data: { filters: Array.isArray(v.data?.filters) ? v.data.filters : [] },
      };
    } catch (e) {
      setError("Invalid JSON: " + (e as Error).message);
      return null;
    }
  }

  function apply() {
    setError("");
    const v = parsed();
    if (v) onApply(v);
  }

  function download() {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(value.name || "board").replace(/[^\w.-]+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        style={{ inset: "5%" }}
        className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div>
            <div className="text-sm font-semibold">JSON Model</div>
            <div className="text-xs text-neutral-500">
              The full dashboard definition. Edit and apply, or export to a file.
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>

        <textarea
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-0 flex-1 resize-none bg-neutral-50 p-4 font-mono text-[12.5px] leading-relaxed text-neutral-800 outline-none dark:bg-neutral-950 dark:text-neutral-200"
        />

        <div className="flex items-center gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          {error && <span className="mr-auto text-xs text-red-600">{error}</span>}
          {!error && <span className="mr-auto text-xs text-neutral-400">JSON dashboard model</span>}
          <button onClick={copy} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Download
          </button>
          <button onClick={apply} className="rounded-lg bg-[#FFEB02] px-4 py-1.5 text-sm font-semibold text-black hover:bg-[#f2df00]">
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
