"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { HealthBadge, type Health } from "./project";
import { PresenceAvatar } from "./presence";
import { SegmentedProgress } from "./progress-viz";

/*
 * Project list + overview surfaces. Ground-truthed on linear.app projects:
 * the project list row is 48px (icon · name · update status · progress %),
 * the overview uses PropertyRow-style rows (12–13px muted labels).
 */

/* ------------------------------------------------------------------ ProjectRow */

export type ProjectRowProps = {
  name: ReactNode;
  icon?: ReactNode;
  lead?: { name: string; image?: string };
  health?: Health;
  done?: number;
  total?: number;
  /** e.g. "No updates" / "Updated 2d ago". */
  update?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/** A project list row: icon, name, health, progress and lead. */
export function ProjectRow({
  name,
  icon,
  lead,
  health,
  done = 0,
  total = 0,
  update,
  onClick,
  className,
}: ProjectRowProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex h-12 w-full items-center gap-3 text-left",
        onClick && "focus-ring hover:bg-surface-hover rounded-[var(--radius-control)] px-2",
        className
      )}
    >
      <span className="bg-surface-selected grid size-6 shrink-0 place-items-center rounded-[var(--radius-small)] [color:var(--content-tertiary)] [&_svg]:size-4">
        {icon ?? "◇"}
      </span>
      <span className="text-ui-default min-w-0 flex-1 truncate [color:var(--content-primary)]">
        {name}
      </span>
      {health ? <HealthBadge health={health} className="hidden md:inline-flex" /> : null}
      {update != null ? (
        <span className="text-ui-small hidden shrink-0 [color:var(--content-tertiary)] lg:block">
          {update}
        </span>
      ) : null}
      <div className="hidden w-28 items-center gap-2 sm:flex">
        <SegmentedProgress
          segments={[{ value: done, color: "var(--intent-accent)" }]}
          total={Math.max(total, 1)}
          className="flex-1"
        />
        <span className="text-ui-caption w-8 shrink-0 text-right [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
          {pct}%
        </span>
      </div>
      {lead ? (
        <PresenceAvatar name={lead.name} image={lead.image} size="sm" className="shrink-0" />
      ) : null}
    </Comp>
  );
}

/* ------------------------------------------------------- ProjectOverviewHeader */

/** The project overview header: icon + title, a summary line, and a property
 * grid slot (compose with PropertyRow). */
export function ProjectOverviewHeader({
  name,
  icon,
  summary,
  properties,
  actions,
  className,
}: {
  name: ReactNode;
  icon?: ReactNode;
  summary?: ReactNode;
  properties?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start gap-3">
        <span className="bg-surface-selected grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] [color:var(--content-tertiary)] [&_svg]:size-5">
          {icon ?? "◇"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-heading-medium font-semibold tracking-[var(--tracking-heading)] [color:var(--content-primary)]">
            {name}
          </h1>
          {summary ? (
            <p className="text-body mt-1 [color:var(--content-secondary)]">{summary}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {properties ? (
        <div className="border-border-subtle flex flex-col border-t pt-3">{properties}</div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- ProjectUpdateItem */

/** A project status update post: author + health + date over the update body. */
export function ProjectUpdateItem({
  author,
  authorImage,
  health,
  date,
  children,
  className,
}: {
  author: string;
  authorImage?: string;
  health?: Health;
  date?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("flex flex-col gap-2 py-3", className)}>
      <div className="flex items-center gap-2">
        <PresenceAvatar name={author} image={authorImage} size="sm" />
        <span className="text-ui-small [color:var(--content-primary)] font-[var(--weight-medium)]">
          {author}
        </span>
        {health ? <HealthBadge health={health} className="h-5" /> : null}
        {date != null ? (
          <span className="text-ui-caption ml-auto [color:var(--content-tertiary)]">{date}</span>
        ) : null}
      </div>
      <div className="text-body [color:var(--content-secondary)]">{children}</div>
    </article>
  );
}

/* ------------------------------------------------------------------ MilestoneRow */

/** A project milestone: name, progress and target date. */
export function MilestoneRow({
  name,
  done = 0,
  total = 0,
  date,
  className,
}: {
  name: ReactNode;
  done?: number;
  total?: number;
  date?: ReactNode;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={cn("flex min-h-[44px] items-center gap-3 py-2", className)}>
      <span aria-hidden className="[color:var(--content-tertiary)]">
        ◆
      </span>
      <span className="text-ui-default min-w-0 flex-1 truncate [color:var(--content-primary)]">
        {name}
      </span>
      <span className="text-ui-caption shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
        {done}/{total}
      </span>
      <div className="hidden w-24 sm:block">
        <SegmentedProgress
          segments={[{ value: done, color: "var(--intent-accent)" }]}
          total={Math.max(total, 1)}
        />
      </div>
      <span className="text-ui-caption w-8 shrink-0 text-right [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
        {pct}%
      </span>
      {date != null ? (
        <span className="text-ui-small hidden w-16 shrink-0 text-right [color:var(--content-tertiary)] md:block">
          {date}
        </span>
      ) : null}
    </div>
  );
}
