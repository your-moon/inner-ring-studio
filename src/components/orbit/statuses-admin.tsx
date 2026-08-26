"use client";

import { DotsSixVertical, DotsThree, Plus } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";
import { StatusIcon, type WorkflowStatus } from "./status-icon";

/*
 * Settings › Statuses — Linear's *current* card editor. Ground-truthed on
 * linear.app/settings/project-statuses:
 *   · panel  640px wide, 10px radius, surface-panel bg
 *   · card   36px tall, 6px radius, raised bg (lch 11 over the panel's lch 9.2)
 *   · icon   14px StatusIcon, grouped by type
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

/** A quiet label for a workflow-status type — the group heading. */
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
        "text-ui-small [color:var(--content-tertiary)] font-[var(--weight-medium)]",
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
  /** Trailing actions; defaults to a "⋯" options button on hover. */
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/**
 * A single status **card** in the editor: a 36px, 6px-radius raised row with a
 * shape-first icon, name, optional description and hover controls.
 */
export function WorkflowStatusRow({
  name,
  status,
  description,
  draggable = true,
  count,
  actions,
  onClick,
  className,
}: WorkflowStatusRowProps) {
  return (
    <div
      className={cn(
        "group/status bg-surface-raised flex h-9 items-center gap-2 rounded-[6px] px-2",
        onClick && "hover:bg-surface-hover cursor-pointer",
        className
      )}
      {...(onClick ? { role: "button", tabIndex: 0, onClick } : {})}
    >
      {draggable ? (
        <DotsSixVertical className="-ml-1 size-4 shrink-0 cursor-grab [color:var(--content-tertiary)] opacity-0 group-hover/status:opacity-100" />
      ) : null}
      <StatusIcon status={status} />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="text-ui-default truncate [color:var(--content-primary)]">
          {name}
        </span>
        {description ? (
          <span className="text-ui-small truncate [color:var(--content-tertiary)]">
            {description}
          </span>
        ) : null}
      </div>
      {count != null ? (
        <span className="text-ui-small shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
          {count}
        </span>
      ) : null}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/status:opacity-100">
        {actions ?? (
          <IconButton aria-label="Status options" size="sm">
            <DotsThree />
          </IconButton>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- StatusTypeSection */

/** A workflow-type group inside the editor: a caption header, its status cards
 * and an inline add row. */
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
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex h-7 items-center justify-between px-2">
        <StatusTypeBadge type={type} />
        {onAdd ? (
          <button
            type="button"
            aria-label={`Add ${TYPE_LABEL[type]} status`}
            onClick={onAdd}
            className="focus-ring grid size-5 place-items-center rounded-[var(--radius-control)] [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)] [&_svg]:size-4"
          >
            <Plus />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------- StatusEditorPanel */

/** The status editor container: the 640px, 10px-radius panel that holds the
 * type sections. */
export function StatusEditorPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-subtle bg-surface-canvas flex w-full max-w-[640px] flex-col gap-4 rounded-[10px] border p-3",
        className
      )}
    >
      {children}
    </div>
  );
}
