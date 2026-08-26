"use client";

import { CaretDown, Lightning, Plus, TextAa, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import IconButton from "./icon-button";

/* --------------------------------------------------------------- QueryTabBar */

export type QueryTab = { id: string; label: ReactNode; dirty?: boolean };

/** The open-query tab strip: active tab underlined, dirty dot, close, and +. */
export function QueryTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  className,
}: {
  tabs: QueryTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onNew?: () => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "border-border-subtle bg-surface-canvas flex h-9 items-stretch gap-0.5 border-b px-1",
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <div
            key={t.id}
            className={cn(
              "group flex items-center gap-1.5 rounded-t-[var(--radius-control)] px-2.5 text-ui-small",
              active
                ? "bg-surface-panel [color:var(--content-primary)] font-[var(--weight-medium)]"
                : "[color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
            )}
          >
            <button
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onSelect(t.id)}
              className="focus-ring flex h-full items-center gap-1.5"
            >
              {t.label}
              {t.dirty ? (
                <span className="bg-content-tertiary size-1.5 rounded-full" />
              ) : null}
            </button>
            {onClose ? (
              <button
                type="button"
                aria-label="Close tab"
                onClick={() => onClose(t.id)}
                className="focus-ring grid size-4 place-items-center rounded-[var(--radius-small)] opacity-0 hover:bg-surface-hover group-hover:opacity-100 [color:var(--content-tertiary)]"
              >
                <X weight="bold" className="size-2.5" />
              </button>
            ) : null}
          </div>
        );
      })}
      {onNew ? (
        <IconButton aria-label="New query" size="sm" className="my-auto" onClick={onNew}>
          <Plus />
        </IconButton>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- RunQueryButton */

/** The primary run control: Run + a menu for run-selection / run-to-file. */
export function RunQueryButton({
  onRun,
  menu,
  running = false,
  disabled = false,
}: {
  onRun: () => void;
  menu?: ReactNode;
  running?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex">
      <Button
        variant="primary"
        size="sm"
        title={running ? "Running" : "Run"}
        loading={running}
        loadingLabel="Running query"
        disabled={disabled}
        onClick={onRun}
        className={menu ? "rounded-r-none" : undefined}
        displayContent="items-first"
      >
        {!running ? <Lightning weight="fill" /> : null}
      </Button>
      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="primary"
              size="sm"
              shape="square"
              aria-label="Run options"
              disabled={disabled || running}
              className="-ml-px rounded-l-none px-0"
            >
              <CaretDown weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- QueryToolbar */

/** The editor toolbar: run control, format, a row-limit selector, and a slot. */
export function QueryToolbar({
  children,
  onFormat,
  limit,
  onLimitChange,
  className,
}: {
  children?: ReactNode;
  onFormat?: () => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-subtle bg-surface-panel flex h-11 items-center gap-2 border-b px-3",
        className
      )}
    >
      {children}
      {onFormat ? (
        <IconButton aria-label="Format query" size="base" onClick={onFormat}>
          <TextAa />
        </IconButton>
      ) : null}
      <div className="flex-1" />
      {limit !== undefined && onLimitChange ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Row limit"
            className="focus-ring press border-border-default [color:var(--content-secondary)] inline-flex h-7 items-center gap-1 rounded-[var(--radius-control)] border px-2 text-ui-small hover:bg-surface-hover"
          >
            Limit {limit}
            <CaretDown weight="bold" className="size-2.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[100, 500, 1000, 5000].map((n) => (
              <DropdownMenuItem key={n} onSelect={() => onLimitChange(n)} className="text-ui-default">
                {n} rows
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- ResultStatusBar */

/** The result footer: row count, elapsed time, and any status/error. */
export function ResultStatusBar({
  rows,
  elapsedMs,
  status,
  className,
}: {
  rows?: number;
  elapsedMs?: number;
  status?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-subtle bg-surface-panel flex h-8 items-center gap-4 border-t px-3 text-ui-caption [color:var(--content-tertiary)]",
        className
      )}
    >
      {rows !== undefined ? (
        <span className="[font-variant-numeric:tabular-nums]">
          {rows.toLocaleString()} row{rows === 1 ? "" : "s"}
        </span>
      ) : null}
      {elapsedMs !== undefined ? (
        <span className="[font-variant-numeric:tabular-nums]">
          {elapsedMs < 1000 ? `${elapsedMs} ms` : `${(elapsedMs / 1000).toFixed(2)} s`}
        </span>
      ) : null}
      <div className="flex-1" />
      {status}
    </div>
  );
}
