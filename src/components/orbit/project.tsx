"use client";

import { Check, FileDashed } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { SegmentedProgress } from "./progress-viz";

/* ---------------------------------------------------------------- HealthBadge */

export type Health = "on-track" | "at-risk" | "off-track" | "no-update";

const HEALTH_META: Record<Health, { label: string; color: string }> = {
  "on-track": { label: "On track", color: "var(--intent-success)" },
  "at-risk": { label: "At risk", color: "#f2c94c" },
  "off-track": { label: "Off track", color: "var(--intent-danger)" },
  "no-update": { label: "No update", color: "var(--content-disabled)" },
};

/** Linear's project health pill: a colored dot + status word. */
export function HealthBadge({ health, className }: { health: Health; className?: string }) {
  const meta = HEALTH_META[health];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-full)] border border-border-default px-2 text-ui-small [color:var(--content-secondary)]",
        className
      )}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

/* ----------------------------------------------------------------- RoadmapBar */

/** A project timeline bar: start → target with progress fill and a label. */
export function RoadmapBar({
  label,
  done,
  total,
  start,
  target,
  className,
}: {
  label?: ReactNode;
  done: number;
  total: number;
  start?: ReactNode;
  target?: ReactNode;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label || target ? (
        <div className="flex items-baseline justify-between text-ui-caption [color:var(--content-tertiary)]">
          <span>{label}</span>
          <span className="[font-variant-numeric:tabular-nums]">{pct}%</span>
        </div>
      ) : null}
      <SegmentedProgress
        total={total}
        segments={[{ value: done, color: "var(--intent-accent)" }]}
      />
      {start || target ? (
        <div className="flex items-baseline justify-between text-ui-caption [color:var(--content-disabled)]">
          <span>{start}</span>
          <span>{target}</span>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- InitiativeCard */

/** A portfolio initiative card: name, health, progress, project count. */
export function InitiativeCard({
  name,
  health,
  done,
  total,
  projectCount,
  onClick,
  className,
}: {
  name: ReactNode;
  health?: ReactNode;
  done: number;
  total: number;
  projectCount?: number;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring border-border-default bg-surface-panel hover:border-border-strong flex w-full flex-col gap-3 rounded-[var(--radius-panel)] border p-4 text-left transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-ui-default [color:var(--content-primary)] min-w-0 flex-1 truncate font-[var(--weight-medium)]">
          {name}
        </span>
        {health}
      </div>
      <SegmentedProgress
        total={total}
        segments={[{ value: done, color: "var(--intent-accent)" }]}
      />
      <div className="text-ui-caption [color:var(--content-tertiary)] flex items-center gap-3 [font-variant-numeric:tabular-nums]">
        <span>{Math.round((done / Math.max(total, 1)) * 100)}%</span>
        {projectCount !== undefined ? <span>{projectCount} projects</span> : null}
      </div>
    </button>
  );
}

/* --------------------------------------------------------------- TemplatePicker */

export type Template = { value: string; label: ReactNode; hint?: ReactNode };

/** Linear's template menu: create from a saved issue template. */
export function TemplatePicker({
  templates,
  onSelect,
  label = "Template",
}: {
  templates: Template[];
  onSelect: (value: string) => void;
  label?: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Templates"
        className="focus-ring press border-border-default [color:var(--content-secondary)] inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-ui-small hover:bg-surface-hover data-[state=open]:bg-surface-hover"
      >
        <FileDashed className="size-3.5" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {templates.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onSelect={() => onSelect(t.value)}
            className="text-ui-default flex flex-col items-start gap-0"
          >
            <span>{t.label}</span>
            {t.hint ? (
              <span className="text-ui-caption [color:var(--content-tertiary)]">
                {t.hint}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------------------------------------------- IntegrationRow */

/** A settings row for an integration: icon, name, description, connect state. */
export function IntegrationRow({
  icon,
  name,
  description,
  connected = false,
  action,
  className,
}: {
  icon?: ReactNode;
  name: ReactNode;
  description?: ReactNode;
  connected?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      <span className="border-border-default bg-surface-canvas grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border [color:var(--content-secondary)] [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-ui-default [color:var(--content-primary)] flex items-center gap-2">
          {name}
          {connected ? (
            <span className="inline-flex items-center gap-1 text-ui-caption [color:var(--intent-success)]">
              <Check weight="bold" className="size-3" /> Connected
            </span>
          ) : null}
        </div>
        {description ? (
          <div className="text-ui-small [color:var(--content-tertiary)] mt-0.5 truncate">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
