"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Badge } from "./badge";
import { SegmentedProgress } from "./progress-viz";

/*
 * Cycle surfaces (sprints). Modelled on Linear's cycles: a list row with a date
 * range + progress, an active-cycle header, and a scope/progress summary.
 */

/* ---------------------------------------------------------------- CycleProgress */

/** Scope progress for a cycle: started + completed against total scope. */
export function CycleProgress({
  started = 0,
  completed = 0,
  total = 0,
  className,
}: {
  started?: number;
  completed?: number;
  total?: number;
  className?: string;
}) {
  const scope = Math.max(total, started + completed, 1);
  const pct = Math.round((completed / scope) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SegmentedProgress
        className="flex-1"
        total={scope}
        segments={[
          { value: completed, color: "var(--intent-accent)" },
          { value: started, color: "#f2c94c" },
        ]}
      />
      <span className="text-ui-caption w-8 shrink-0 text-right [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
        {pct}%
      </span>
    </div>
  );
}

/* --------------------------------------------------------------------- CycleRow */

export type CycleRowProps = {
  name: ReactNode;
  range?: ReactNode;
  active?: boolean;
  started?: number;
  completed?: number;
  total?: number;
  onClick?: () => void;
  className?: string;
};

/** A cycle list row: name, date range, active tag, and progress. */
export function CycleRow({
  name,
  range,
  active = false,
  started = 0,
  completed = 0,
  total = 0,
  onClick,
  className,
}: CycleRowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex h-11 w-full items-center gap-3 text-left",
        onClick && "focus-ring hover:bg-surface-hover rounded-[var(--radius-control)] px-2",
        className
      )}
    >
      <span className="text-ui-default min-w-0 flex-1 truncate [color:var(--content-primary)]">
        {name}
      </span>
      {active ? <Badge intent="accent">Active</Badge> : null}
      {range != null ? (
        <span className="text-ui-small hidden shrink-0 [color:var(--content-tertiary)] sm:block">
          {range}
        </span>
      ) : null}
      <CycleProgress
        started={started}
        completed={completed}
        total={total}
        className="w-28 shrink-0"
      />
    </Comp>
  );
}

/* ------------------------------------------------------------- ActiveCycleHeader */

/** The active-cycle header: name, date range, scope counts and progress. */
export function ActiveCycleHeader({
  name,
  range,
  started = 0,
  completed = 0,
  total = 0,
  className,
}: {
  name: ReactNode;
  range?: ReactNode;
  started?: number;
  completed?: number;
  total?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-heading-small font-semibold tracking-[var(--tracking-heading)] [color:var(--content-primary)]">
          {name}
        </h2>
        <Badge intent="accent">Active</Badge>
        {range != null ? (
          <span className="text-ui-small ml-auto [color:var(--content-tertiary)]">{range}</span>
        ) : null}
      </div>
      <CycleProgress started={started} completed={completed} total={total} />
      <div className="text-ui-small flex gap-4 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
        <span>{total} scope</span>
        <span>{started} started</span>
        <span>{completed} completed</span>
      </div>
    </div>
  );
}
