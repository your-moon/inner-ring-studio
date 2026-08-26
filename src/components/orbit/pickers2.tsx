"use client";

import { Check, Flag, Layers as StackIcon, RefreshCw, Users } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ProgressDonut } from "./progress-viz";

const TRIGGER = cn(
  "focus-ring press inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-ui-small [color:var(--content-secondary)] whitespace-nowrap",
  "hover:bg-surface-hover data-[state=open]:bg-surface-hover"
);
const ROW = "text-ui-default flex items-center gap-2";

/* ---------------------------------------------------------------- CyclePicker */

export type Cycle = { value: string; label: ReactNode; done?: number; total?: number };

/** Linear's cycle menu: active/upcoming cycles with progress. */
export function CyclePicker({
  cycles,
  value,
  onChange,
}: {
  cycles: Cycle[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const current = cycles.find((c) => c.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Cycle">
        <RefreshCw className="size-3.5" />
        {current?.label ?? "No cycle"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem onSelect={() => onChange(null)} className={ROW}>
          <span className="flex-1">No cycle</span>
          {value === null ? <Check className="size-3.5" /> : null}
        </DropdownMenuItem>
        {cycles.map((c) => (
          <DropdownMenuItem key={c.value} onSelect={() => onChange(c.value)} className={ROW}>
            {c.total ? <ProgressDonut value={c.done ?? 0} total={c.total} /> : null}
            <span className="flex-1">{c.label}</span>
            {c.value === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------- ProjectPicker */

export type Project = { value: string; label: ReactNode; done?: number; total?: number };

/** Linear's project menu: projects with a progress donut. */
export function ProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const current = projects.find((p) => p.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Project">
        <StackIcon className="size-3.5" />
        {current?.label ?? "No project"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem onSelect={() => onChange(null)} className={ROW}>
          <span className="flex-1">No project</span>
          {value === null ? <Check className="size-3.5" /> : null}
        </DropdownMenuItem>
        {projects.map((p) => (
          <DropdownMenuItem key={p.value} onSelect={() => onChange(p.value)} className={ROW}>
            {p.total ? <ProgressDonut value={p.done ?? 0} total={p.total} /> : null}
            <span className="flex-1">{p.label}</span>
            {p.value === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------------------------------------------- TeamSwitcher */

export type Team = { id: string; name: string; key?: string };

/** Linear's team switcher: pick a team, showing its key. */
export function TeamSwitcher({
  teams,
  activeId,
  onSelect,
}: {
  teams: Team[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const active = teams.find((t) => t.id === activeId) ?? teams[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Switch team">
        <Users className="size-3.5" />
        {active?.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {teams.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => onSelect(t.id)} className={ROW}>
            <span className="bg-surface-hover [color:var(--content-tertiary)] grid size-5 place-items-center rounded-[var(--radius-small)] text-[9px] leading-none font-[var(--weight-semibold)] uppercase">
              {t.key ?? t.name.slice(0, 2)}
            </span>
            <span className="flex-1">{t.name}</span>
            {t.id === activeId ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------- MilestoneMarker */

/** A milestone flag on a timeline or project header. */
export function MilestoneMarker({
  label,
  reached = false,
  className,
}: {
  label: ReactNode;
  reached?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-full)] border px-2 text-ui-small",
        reached
          ? "border-[var(--intent-success)]/40 [color:var(--intent-success)]"
          : "border-border-default [color:var(--content-secondary)]",
        className
      )}
    >
      <Flag className="size-3" />
      {label}
    </span>
  );
}
