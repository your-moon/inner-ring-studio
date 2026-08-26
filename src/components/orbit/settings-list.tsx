"use client";

import { FileText } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Shared settings-list scaffolding used across Labels / Statuses / Templates:
 * a toolbar header (title + count + action) over a divided list of 44px rows.
 */

/* ------------------------------------------------------------ SettingsListHeader */

/** The bar above a settings list: a title with count on the left, action right. */
export function SettingsListHeader({
  title,
  count,
  action,
  className,
}: {
  title: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-ui-default [color:var(--content-primary)] font-[var(--weight-medium)]">
          {title}
        </span>
        {count != null ? (
          <span className="text-ui-small [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
            {count}
          </span>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ SettingsList */

/** A divided container for settings rows, with an optional header bar. */
export function SettingsList({
  header,
  children,
  className,
}: {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {header}
      <div className="divide-border-subtle divide-y">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ TemplateRow */

export type TemplateRowProps = {
  name: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Trailing metadata (e.g. "Updated by Alex · 3d"). */
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/** An issue/project template row: icon, name, description, updated meta. */
export function TemplateRow({
  name,
  description,
  icon,
  meta,
  actions,
  onClick,
  className,
}: TemplateRowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <div
      className={cn(
        "group/tpl flex min-h-[44px] items-center gap-2.5 py-2",
        className
      )}
    >
      <Comp
        {...(onClick ? { type: "button" as const, onClick } : {})}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="shrink-0 [color:var(--content-tertiary)] [&_svg]:size-[var(--icon-md)]">
          {icon ?? <FileText />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ui-default block truncate [color:var(--content-primary)]">
            {name}
          </span>
          {description ? (
            <span className="text-ui-small block truncate [color:var(--content-tertiary)]">
              {description}
            </span>
          ) : null}
        </span>
      </Comp>
      {meta ? (
        <span className="text-ui-small hidden shrink-0 [color:var(--content-tertiary)] sm:block">
          {meta}
        </span>
      ) : null}
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/tpl:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
