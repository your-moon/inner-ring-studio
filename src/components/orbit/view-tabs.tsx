"use client";

import { cn } from "@/lib/utils";

export type ViewTab = { value: string; label: string; count?: number };

/** The list-view switcher above a table (Active / Backlog / All), Linear-style:
 * 12px medium tabs with an accent underline on the active one. */
export function ViewTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ViewTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "border-border-subtle flex items-center gap-4 border-b",
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-state={active ? "active" : "inactive"}
            onClick={() => onChange(t.value)}
            className={cn(
              "focus-ring press relative -mb-px flex h-7 items-center gap-1.5 border-b-2 text-ui-small font-[var(--weight-medium)]",
              active
                ? "border-primary [color:var(--content-primary)]"
                : "border-transparent [color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className="text-ui-caption [color:var(--content-disabled)] [font-variant-numeric:tabular-nums]">
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
