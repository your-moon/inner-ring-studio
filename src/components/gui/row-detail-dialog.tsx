"use client";

import { useEffect } from "react";
import { LucideX } from "lucide-react";

export interface RowDetailField {
  name: string;
  value: unknown;
}

/**
 * DBeaver-style single-row detail view: every column of the focused row shown
 * vertically as name → value. Opened from the grid with the Space key.
 */
export default function RowDetailDialog({
  fields,
  onClose,
}: {
  fields: RowDetailField[] | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!fields) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fields, onClose]);

  if (!fields) return null;

  const render = (v: unknown) => {
    if (v === null || v === undefined)
      return <span className="text-neutral-400 italic">NULL</span>;
    return String(v);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80%] w-[min(640px,90%)] flex-col rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Row detail</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <LucideX className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {fields.map((f, i) => (
                <tr
                  key={i}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="w-1/3 px-4 py-2 align-top font-mono text-xs font-medium text-neutral-500">
                    {f.name}
                  </td>
                  <td
                    className="px-4 py-2 align-top font-mono text-xs break-words whitespace-pre-wrap"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(String(f.value ?? ""))
                        .catch(() => {})
                    }
                    title="Click to copy"
                  >
                    {render(f.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
