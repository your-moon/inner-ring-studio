import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ShortcutEntry = { keys: ReactNode; label: ReactNode };
export type ShortcutGroup = { title: ReactNode; entries: ShortcutEntry[] };

/** Linear's keyboard cheatsheet (the ? dialog): grouped action/keys rows. */
export function KeyboardShortcutList({
  groups,
  className,
}: {
  groups: ShortcutGroup[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-x-8 gap-y-6 sm:grid-cols-2", className)}>
      {groups.map((g, i) => (
        <div key={i}>
          <div className="text-ui-caption [color:var(--content-tertiary)] mb-2 font-[var(--weight-medium)] tracking-[0.06em] uppercase">
            {g.title}
          </div>
          <div className="flex flex-col">
            {g.entries.map((e, j) => (
              <div
                key={j}
                className="flex h-8 items-center justify-between gap-4"
              >
                <span className="text-ui-default [color:var(--content-secondary)]">
                  {e.label}
                </span>
                <span className="flex shrink-0 items-center gap-1">{e.keys}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
