"use client";

import { ArrowSquareOut, CalendarBlank, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";

/*
 * Issue-detail metadata rows: the due/target date badge and linked-resource
 * rows. Modelled on Linear's issue properties (overdue reads danger; links are
 * favicon + title + open-in-new).
 */

/* ----------------------------------------------------------------- DueDateBadge */

export type DueTone = "default" | "soon" | "overdue";

/** A target/due-date pill; overdue reads danger, due-soon reads warning. */
export function DueDateBadge({
  date,
  tone = "default",
  icon = true,
  className,
}: {
  date: ReactNode;
  tone?: DueTone;
  icon?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-ui-small inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-full)] px-2 whitespace-nowrap [&_svg]:size-3.5",
        tone === "overdue"
          ? "bg-[var(--intent-danger-soft)] [color:var(--intent-danger)]"
          : tone === "soon"
            ? "bg-[var(--intent-warning-soft)] [color:var(--intent-warning)]"
            : "border-border-default border [color:var(--content-secondary)]",
        className
      )}
    >
      {icon ? <CalendarBlank /> : null}
      {date}
    </span>
  );
}

/* ------------------------------------------------------------ LinkedResourceRow */

/** A linked resource row: favicon/icon + title, an optional context line, and
 * open / remove actions. */
export function LinkedResourceRow({
  title,
  icon,
  context,
  onOpen,
  onRemove,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  context?: ReactNode;
  onOpen?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/link border-border-default bg-surface-panel flex items-center gap-2.5 rounded-[var(--radius-control)] border px-2.5 py-2",
        className
      )}
    >
      <span className="shrink-0 [color:var(--content-tertiary)] [&_svg]:size-[var(--icon-md)]">
        {icon ?? <ArrowSquareOut />}
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="text-ui-small block truncate [color:var(--content-primary)]">
          {title}
        </span>
        {context ? (
          <span className="text-ui-caption block truncate [color:var(--content-tertiary)]">
            {context}
          </span>
        ) : null}
      </button>
      <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/link:opacity-100">
        {onOpen ? (
          <IconButton aria-label="Open link" size="sm" onClick={onOpen}>
            <ArrowSquareOut />
          </IconButton>
        ) : null}
        {onRemove ? (
          <IconButton aria-label="Remove link" size="sm" onClick={onRemove}>
            <X />
          </IconButton>
        ) : null}
      </span>
    </div>
  );
}
