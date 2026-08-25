"use client";

import { DotsSixVertical, Plus } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { StatusIcon, type WorkflowStatus } from "./status-icon";

/*
 * Settings › Statuses management. The workflow-status list groups rows by type
 * (Backlog / Unstarted / Started / Completed / Cancelled), each row a draggable
 * StatusIcon + name. Row height mirrors the verified 44px settings-list row.
 */

export type StatusType =
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "cancelled";

const TYPE_LABEL: Record<StatusType, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
};

/* ------------------------------------------------------------- StatusTypeBadge */

/** A quiet label for a workflow-status type. */
export function StatusTypeBadge({
  type,
  className,
}: {
  type: StatusType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-ui-caption [color:var(--content-tertiary)] font-[var(--weight-medium)]",
        className
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

/* ------------------------------------------------------------ WorkflowStatusRow */

export type WorkflowStatusRowProps = {
  name: ReactNode;
  status: WorkflowStatus;
  description?: ReactNode;
  /** Show a drag handle on hover for reordering. */
  draggable?: boolean;
  /** Trailing issue count. */
  count?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** A workflow-status row: shape-first icon, name, optional description. */
export function WorkflowStatusRow({
  name,
  status,
  description,
  draggable = true,
  count,
  actions,
  className,
}: WorkflowStatusRowProps) {
  return (
    <div
      className={cn(
        "group/status flex min-h-[44px] items-center gap-2.5 py-2",
        className
      )}
    >
      {draggable ? (
        <DotsSixVertical className="size-4 shrink-0 cursor-grab opacity-0 [color:var(--content-tertiary)] group-hover/status:opacity-100" />
      ) : null}
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <span className="text-ui-default [color:var(--content-primary)]">
          {name}
        </span>
        {description ? (
          <span className="text-ui-small ml-2 [color:var(--content-tertiary)]">
            {description}
          </span>
        ) : null}
      </div>
      {count != null ? (
        <span className="text-ui-small shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
          {count}
        </span>
      ) : null}
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/status:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- StatusTypeSection */

/** A workflow-type group: a caption header, an add control, and its rows. */
export function StatusTypeSection({
  type,
  onAdd,
  children,
  className,
}: {
  type: StatusType;
  onAdd?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex h-8 items-center justify-between">
        <StatusTypeBadge type={type} />
        {onAdd ? (
          <button
            type="button"
            aria-label={`Add ${TYPE_LABEL[type]} status`}
            onClick={onAdd}
            className="focus-ring grid size-6 place-items-center rounded-[var(--radius-control)] [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)] [&_svg]:size-4"
          >
            <Plus />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
