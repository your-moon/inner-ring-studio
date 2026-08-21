"use client";

import { BaseDriver } from "@/drivers/base-driver";
import { escapeSqlValue } from "@/drivers/sqlite/sql-helper";
import { parseCsv } from "@/lib/csv";
import { LucideUpload, LucideX } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  driver: BaseDriver;
  schemaName: string;
  tableName: string;
  columns: string[]; // target table column names
  onClose: () => void;
  onImported: () => void;
}

const BATCH = 500;

export default function ImportCsvDialog({
  driver,
  schemaName,
  tableName,
  columns,
  onClose,
  onImported,
}: Props) {
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  // mapping[tableColumn] = csv header index, or -1 to skip
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const onFile = useCallback(
    async (file: File) => {
      setError("");
      setDone(null);
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      setFileName(file.name);
      setCsvHeaders(headers);
      setCsvRows(rows);
      // auto-map by case-insensitive name match
      const lower = headers.map((h) => h.toLowerCase());
      const m: Record<string, number> = {};
      for (const col of columns) {
        m[col] = lower.indexOf(col.toLowerCase());
      }
      setMapping(m);
    },
    [columns]
  );

  const mappedCols = columns.filter((c) => (mapping[c] ?? -1) >= 0);

  async function runImport() {
    if (mappedCols.length === 0) {
      setError("Map at least one column.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const target = `${driver.escapeId(schemaName)}.${driver.escapeId(tableName)}`;
      const colList = mappedCols.map((c) => driver.escapeId(c)).join(", ");
      const statements: string[] = [];
      for (let i = 0; i < csvRows.length; i += BATCH) {
        const chunk = csvRows.slice(i, i + BATCH);
        const valuesSql = chunk
          .map(
            (r) =>
              "(" +
              mappedCols
                .map((c) => {
                  const v = r[mapping[c]];
                  // Empty cell -> NULL; otherwise a string literal (DBs cast).
                  return escapeSqlValue(v === undefined || v === "" ? null : v);
                })
                .join(", ") +
              ")"
          )
          .join(", ");
        statements.push(`INSERT INTO ${target} (${colList}) VALUES ${valuesSql}`);
      }
      await driver.transaction(statements);
      setDone(csvRows.length);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const select =
    "irs-select rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950";

  if (typeof document === "undefined") return null;

  // Portal to <body> so the modal isn't trapped under the result grid's stacking
  // context (this dialog is mounted deep in the table tab).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-semibold">
            Import CSV into <span className="font-mono">{tableName}</span>
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {done !== null ? (
            <div className="py-6 text-center">
              <p className="text-lg font-medium text-green-600">
                Imported {done.toLocaleString()} rows.
              </p>
              <button
                onClick={onClose}
                className="mt-4 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00]"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-6 text-sm text-neutral-500 hover:border-blue-400 dark:border-neutral-700">
                <LucideUpload className="h-4 w-4" />
                {fileName || "Choose a CSV file…"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                />
              </label>

              {csvHeaders.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-neutral-500">
                    {csvRows.length.toLocaleString()} rows · map columns:
                  </p>
                  <div className="space-y-2">
                    {columns.map((col) => (
                      <div key={col} className="flex items-center gap-2">
                        <span className="w-1/2 truncate font-mono text-sm">{col}</span>
                        <span className="text-neutral-400">←</span>
                        <select
                          className={select + " w-1/2"}
                          value={mapping[col] ?? -1}
                          onChange={(e) =>
                            setMapping((m) => ({ ...m, [col]: Number(e.target.value) }))
                          }
                        >
                          <option value={-1}>— skip —</option>
                          {csvHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        {done === null && (
          <div className="flex justify-end gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-500">
              Cancel
            </button>
            <button
              onClick={runImport}
              disabled={busy || mappedCols.length === 0}
              className="rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00] disabled:opacity-50"
            >
              {busy
                ? "Importing…"
                : `Import ${csvRows.length.toLocaleString()} rows`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
