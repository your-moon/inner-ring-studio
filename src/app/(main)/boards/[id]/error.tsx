"use client";

import Link from "next/link";

/** Keeps a chart/render error contained to the board instead of white-screening. */
export default function BoardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-16 text-center">
      <p className="text-sm font-medium">This board couldn&apos;t be rendered.</p>
      <p className="text-sm text-neutral-500">
        A chart may reference a connection that no longer exists.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00]"
        >
          Retry
        </button>
        <Link
          href="/boards"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Back to boards
        </Link>
      </div>
    </div>
  );
}
