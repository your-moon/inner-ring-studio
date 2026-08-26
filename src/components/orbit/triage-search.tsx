"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/*
 * Triage inbox rows and global-search results. The search modal itself is the
 * existing <CommandMenu> + <CommandGroup>; these add the triage action row and
 * a result row with breadcrumb context.
 */

/* -------------------------------------------------------------------- TriageRow */

/** A triage inbox row: identity + title with accept / decline / merge actions. */
export function TriageRow({
  id,
  title,
  leading,
  meta,
  onAccept,
  onDecline,
  onMerge,
  actions,
  className,
}: {
  id?: ReactNode;
  title: ReactNode;
  /** Leading content — a priority/status icon, labels, etc. */
  leading?: ReactNode;
  /** Trailing metadata (assignee, age). */
  meta?: ReactNode;
  onAccept?: () => void;
  onDecline?: () => void;
  onMerge?: () => void;
  /** Replace the default action cluster. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/triage border-border-subtle flex min-h-[44px] items-center gap-2.5 border-b py-2",
        className
      )}
    >
      {leading ? <span className="flex shrink-0 items-center gap-2">{leading}</span> : null}
      {id != null ? (
        <span className="text-ui-small shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
          {id}
        </span>
      ) : null}
      <span className="text-ui-default min-w-0 flex-1 truncate [color:var(--content-primary)]">
        {title}
      </span>
      {meta ? (
        <span className="text-ui-small hidden shrink-0 [color:var(--content-tertiary)] md:block">
          {meta}
        </span>
      ) : null}
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover/triage:opacity-100">
        {actions ?? (
          <>
            {onAccept ? (
              <Button variant="secondary" size="sm" title="Accept" onClick={onAccept} />
            ) : null}
            {onMerge ? (
              <Button variant="secondary" size="sm" title="Merge" onClick={onMerge} />
            ) : null}
            {onDecline ? (
              <Button variant="secondary" size="sm" title="Decline" onClick={onDecline} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- SearchResultRow */

/** A global-search result: type icon, title, a breadcrumb context, shortcut. */
export function SearchResultRow({
  icon,
  title,
  context,
  shortcut,
  active,
  onSelect,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  /** Breadcrumb context, e.g. "MOO · In Progress". */
  context?: ReactNode;
  shortcut?: ReactNode;
  active?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "text-ui-default flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left",
        active ? "bg-surface-hover" : "hover:bg-surface-hover",
        className
      )}
    >
      {icon ? (
        <span className="shrink-0 [color:var(--content-tertiary)] [&_svg]:size-[var(--icon-sm)]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate [color:var(--content-primary)]">{title}</span>
      {context != null ? (
        <span className="text-ui-small shrink-0 truncate [color:var(--content-tertiary)]">
          {context}
        </span>
      ) : null}
      {shortcut ? <span className="shrink-0">{shortcut}</span> : null}
    </button>
  );
}

/* ------------------------------------------------------------- SearchResultGroup */

/** A titled group of search results (Issues / Projects / People…). */
export function SearchResultGroup({
  heading,
  children,
  className,
}: {
  heading: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pb-1 last:pb-0", className)} role="group">
      <div className="text-ui-caption px-2 pt-2 pb-1 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
        {heading}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
