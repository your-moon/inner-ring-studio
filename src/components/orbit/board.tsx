"use client";

import { Plus } from "@phosphor-icons/react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";
import { PriorityIcon, type Priority } from "./priority-icon";
import { StatusIcon, type WorkflowStatus } from "./status-icon";

/* --------------------------------------------------------------- BoardColumn */

/** A Linear board (kanban) column: status header + count, then its cards. */
export function BoardColumn({
  status,
  title,
  count,
  onAdd,
  children,
  className,
}: {
  status?: WorkflowStatus;
  title: ReactNode;
  count?: number;
  onAdd?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-72 shrink-0 flex-col gap-2", className)}>
      <div className="flex h-8 items-center gap-2 px-1">
        {status ? <StatusIcon status={status} /> : null}
        <span className="text-ui-small [color:var(--content-primary)] font-[var(--weight-medium)]">
          {title}
        </span>
        {count !== undefined ? (
          <span className="text-ui-small [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
            {count}
          </span>
        ) : null}
        <div className="flex-1" />
        {onAdd ? (
          <IconButton aria-label="Add card" size="sm" onClick={onAdd}>
            <Plus />
          </IconButton>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- BoardCard */

/** A Linear board card: id + priority, title, then a labels/assignee footer. */
export function BoardCard({
  id,
  title,
  priority,
  footer,
  onClick,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement> & {
  id: ReactNode;
  title: ReactNode;
  priority?: Priority;
  footer?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring border-border-default bg-surface-panel hover:border-border-strong flex w-full flex-col gap-2 rounded-[var(--radius-menu)] border p-3 text-left transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        {priority ? <PriorityIcon priority={priority} /> : null}
        <span className="text-ui-caption [color:var(--content-tertiary)] font-mono">
          {id}
        </span>
      </div>
      <span className="text-ui-default [color:var(--content-primary)] line-clamp-2">
        {title}
      </span>
      {footer ? (
        <div className="flex items-center gap-1.5 pt-0.5">{footer}</div>
      ) : null}
    </button>
  );
}
