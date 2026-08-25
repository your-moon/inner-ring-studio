"use client";

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { PriorityIcon, type Priority } from "./priority-icon";
import { StatusIcon, type WorkflowStatus } from "./status-icon";

/**
 * The Linear issue row: priority glyph, status glyph, id, title, then a
 * trailing metadata cluster (labels, assignee, date). ~40px, 13px/500 title.
 */
export type IssueRowProps = HTMLAttributes<HTMLDivElement> & {
  id: ReactNode;
  title: ReactNode;
  status?: WorkflowStatus;
  priority?: Priority;
  trailing?: ReactNode;
  selected?: boolean;
};

export function IssueRow({
  id,
  title,
  status,
  priority,
  trailing,
  selected,
  className,
  ...props
}: IssueRowProps) {
  return (
    <div
      data-selected={selected || undefined}
      className={cn(
        "group flex h-10 items-center gap-2.5 px-3 hover:bg-surface-hover data-[selected=true]:bg-surface-selected",
        className
      )}
      {...props}
    >
      {priority ? <PriorityIcon priority={priority} /> : null}
      {status ? <StatusIcon status={status} /> : null}
      <span className="text-ui-small [color:var(--content-tertiary)] w-16 shrink-0 font-mono [font-variant-numeric:tabular-nums]">
        {id}
      </span>
      <span className="text-ui-default [color:var(--content-primary)] min-w-0 flex-1 truncate font-[var(--weight-medium)]">
        {title}
      </span>
      {trailing ? (
        <span className="flex shrink-0 items-center gap-2">{trailing}</span>
      ) : null}
    </div>
  );
}
