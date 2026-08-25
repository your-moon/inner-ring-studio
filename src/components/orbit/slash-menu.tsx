"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SlashCommand = {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
};

/** Linear's editor "/" menu: a list of block types to insert. Render inside a
 * Popover/floating layer anchored at the caret. */
export function SlashMenu({
  commands,
  activeValue,
  onSelect,
  className,
}: {
  commands: SlashCommand[];
  activeValue?: string;
  onSelect: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="listbox"
      className={cn(
        "border-border-default bg-surface-overlay w-64 overflow-hidden rounded-[var(--radius-menu)] border p-1 shadow-[var(--shadow-menu)]",
        className
      )}
    >
      {commands.map((c) => {
        const active = c.value === activeValue;
        return (
          <button
            key={c.value}
            role="option"
            aria-selected={active}
            type="button"
            onClick={() => onSelect(c.value)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left",
              active ? "bg-surface-hover" : "hover:bg-surface-hover"
            )}
          >
            {c.icon ? (
              <span className="border-border-subtle bg-surface-panel grid size-7 shrink-0 place-items-center rounded-[var(--radius-control)] border [color:var(--content-secondary)] [&_svg]:size-4">
                {c.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="text-ui-default [color:var(--content-primary)] block truncate">
                {c.label}
              </span>
              {c.hint ? (
                <span className="text-ui-caption [color:var(--content-tertiary)] block truncate">
                  {c.hint}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
