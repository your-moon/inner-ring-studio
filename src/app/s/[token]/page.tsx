"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Snapshot {
  title: string;
  sql: string | null;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  createdAt: number;
}

function Mark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-800 dark:border-neutral-200">
      <span className="h-2 w-2 rounded-full bg-neutral-800 dark:bg-neutral-200" />
    </span>
  );
}

const cell = (v: unknown) =>
  v === null || v === undefined ? (
    <span className="text-neutral-400 italic">NULL</span>
  ) : (
    String(v)
  );

/** Public, login-free view of a shared query result snapshot. */
export default function SharedSnapshotPage() {
  const { token } = useParams<{ token: string }>();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setSnap(j.snapshot))
      .catch(() => setNotFound(true));
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <Mark />
          <span className="text-sm font-semibold">Inner Ring Studio</span>
        </div>
        <a
          href="https://cloud.carrot-soft.tech/signup"
          className="rounded-lg bg-[#FFEB02] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#f2df00]"
        >
          Try Cloud free
        </a>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {notFound && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-16 text-center text-sm text-neutral-500 dark:border-neutral-700">
            This shared result doesn&apos;t exist or was revoked.
          </div>
        )}

        {snap && (
          <>
            <h1 className="text-xl font-bold">{snap.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {snap.rowCount.toLocaleString()} rows · shared{" "}
              {new Date(snap.createdAt).toLocaleDateString()}
              {snap.rowCount > snap.rows.length && ` · showing first ${snap.rows.length}`}
            </p>

            {snap.sql && (
              <pre className="mt-4 overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-100 dark:bg-neutral-800">
                {snap.sql}
              </pre>
            )}

            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    {snap.columns.map((c, i) => (
                      <th key={i} className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-neutral-500">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snap.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                      {row.map((v, ci) => (
                        <td key={ci} className="max-w-xs truncate px-3 py-1.5 font-mono text-xs" title={String(v ?? "")}>
                          {cell(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-center text-xs text-neutral-400">
              Shared with{" "}
              <a href="https://cloud.carrot-soft.tech" className="font-medium text-[#a07a00] hover:underline dark:text-[#FFEB02]">
                Inner Ring Studio
              </a>{" "}
              — browse, query, and share your own databases.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
