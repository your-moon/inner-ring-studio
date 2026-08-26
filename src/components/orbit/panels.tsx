"use client";

import { X } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";

/* ----------------------------------------------------------- BulkActionBar */

/** The floating bar that appears when rows are selected: count + actions.
 * Modelled on Linear/Attio's selection toolbar. */
export function BulkActionBar({
  count,
  onClear,
  children,
  className,
}: {
  count: number;
  onClear?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <div
      role="toolbar"
      aria-label={`${count} selected`}
      className={cn(
        "border-border-default bg-surface-overlay flex items-center gap-2 rounded-[var(--radius-menu)] border py-1.5 pr-2 pl-3 shadow-[var(--shadow-menu)]",
        className
      )}
    >
      <span className="text-ui-small [color:var(--content-secondary)] font-[var(--weight-medium)] [font-variant-numeric:tabular-nums]">
        {count} selected
      </span>
      <span className="bg-border-subtle mx-1 h-4 w-px" />
      <div className="flex items-center gap-1">{children}</div>
      {onClear ? (
        <IconButton aria-label="Clear selection" size="sm" onClick={onClear}>
          <X />
        </IconButton>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- PropertyRow */

/** A label + control row for a detail/inspector panel: quiet label on the
 * left, the value or its editor on the right. */
export function PropertyRow({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,120px)_1fr] items-center gap-3 py-1.5",
        className
      )}
    >
      <span className="text-ui-small [color:var(--content-tertiary)]">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------- InspectorPanel */

/** The right-hand detail panel shell: sticky header with title + close, a
 * scrolling body. Sits beside content, not over it. */
export function InspectorPanel({
  title,
  onClose,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  onClose?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "bg-surface-panel flex h-full min-h-0 w-[320px] flex-col",
        className
      )}
    >
      <div className="border-border-subtle flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <span className="text-ui-default [color:var(--content-primary)] truncate font-[var(--weight-medium)]">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {onClose ? (
            <IconButton aria-label="Close panel" size="sm" onClick={onClose}>
              <X />
            </IconButton>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  );
}

/* ----------------------------------------------------------- SettingsSection */

/** A settings group: a titled block with an optional description and rows. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div>
        <h3 className="text-heading-small [color:var(--content-primary)] font-semibold tracking-[var(--tracking-heading)]">
          {title}
        </h3>
        {description ? (
          <p className="text-ui-small [color:var(--content-tertiary)] mt-1 max-w-prose">
            {description}
          </p>
        ) : null}
      </div>
      <div className="border-border-default bg-surface-panel divide-border-subtle divide-y rounded-[var(--radius-panel)] border">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  children,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3", className)}>
      <div className="min-w-0">
        <div className="text-ui-default [color:var(--content-primary)]">{label}</div>
        {description ? (
          <div className="text-ui-small [color:var(--content-tertiary)] mt-0.5">
            {description}
          </div>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- DangerZone */

/** The destructive settings block: a red-edged frame for irreversible actions. */
export function DangerZone({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-panel)] border border-intent-danger/40 bg-[var(--intent-danger-soft)]",
        className
      )}
    >
      <div className="divide-[var(--intent-danger)]/15 flex flex-col divide-y">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ NotificationItem */

export type NotificationItemProps = HTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  time?: ReactNode;
  unread?: boolean;
};

/** A row in the notification inbox: unread dot, icon, title/detail, time. */
export function NotificationItem({
  icon,
  title,
  detail,
  time,
  unread = false,
  className,
  ...props
}: NotificationItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring group flex w-full items-start gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left hover:bg-surface-hover",
        className
      )}
      {...props}
    >
      <span className="mt-1.5 flex w-2 shrink-0 justify-center">
        {unread ? <span className="bg-primary size-2 rounded-full" /> : null}
      </span>
      {icon ? (
        <span className="mt-0.5 [color:var(--content-tertiary)] [&_svg]:size-[var(--icon-md)]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="text-ui-default [color:var(--content-primary)] block truncate">
          {title}
        </span>
        {detail ? (
          <span className="text-ui-small [color:var(--content-tertiary)] block truncate">
            {detail}
          </span>
        ) : null}
      </span>
      {time ? (
        <span className="text-ui-caption [color:var(--content-tertiary)] shrink-0">
          {time}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------------------------------------------------------- CommandRow */

export type CommandRowProps = HTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  shortcut?: ReactNode;
};

/** A command-palette row: icon + label, optional context hint, and shortcut. */
export function CommandRow({
  icon,
  label,
  hint,
  shortcut,
  className,
  ...props
}: CommandRowProps) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring text-ui-default flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left hover:bg-surface-hover aria-selected:bg-surface-hover",
        className
      )}
      {...props}
    >
      {icon ? (
        <span className="[color:var(--content-tertiary)] [&_svg]:size-[var(--icon-sm)]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate [color:var(--content-primary)]">
        {label}
      </span>
      {hint ? (
        <span className="text-ui-small [color:var(--content-tertiary)] shrink-0">
          {hint}
        </span>
      ) : null}
      {shortcut ? <span className="shrink-0">{shortcut}</span> : null}
    </button>
  );
}
