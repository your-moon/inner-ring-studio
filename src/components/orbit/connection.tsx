"use client";

import { ArrowsClockwise, CloudCheck, WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import EnvBadge from "./env-badge";

/* --------------------------------------------------------- ConnectionStatus */

export type ConnState = "connected" | "connecting" | "offline";

const CONN_META: Record<ConnState, { label: string; color: string; pulse?: boolean }> = {
  connected: { label: "Connected", color: "var(--intent-success)" },
  connecting: { label: "Connecting", color: "var(--intent-warning)", pulse: true },
  offline: { label: "Offline", color: "var(--content-disabled)" },
};

/** A DB connection's liveness: a colored dot + label. Never color alone. */
export function ConnectionStatus({
  state,
  showLabel = true,
  className,
}: {
  state: ConnState;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = CONN_META[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        {...(showLabel
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": meta.label, title: meta.label })}
        className={cn("size-1.5 shrink-0 rounded-full", meta.pulse && "animate-pulse")}
        style={{ backgroundColor: meta.color }}
      />
      {showLabel ? (
        <span className="text-ui-small [color:var(--content-secondary)]">
          {meta.label}
        </span>
      ) : null}
    </span>
  );
}

/* ----------------------------------------------------------- VaultSyncStatus */

export type SyncState = "synced" | "syncing" | "error";

/** The encrypted vault's sync state, for the sidebar footer / settings. */
export function VaultSyncStatus({
  state,
  at,
  className,
}: {
  state: SyncState;
  at?: ReactNode;
  className?: string;
}) {
  const map = {
    synced: { icon: <CloudCheck />, label: "Vault synced", ink: "[color:var(--content-tertiary)]" },
    syncing: { icon: <ArrowsClockwise className="animate-spin" />, label: "Syncing…", ink: "[color:var(--content-tertiary)]" },
    error: { icon: <WarningCircle weight="fill" />, label: "Sync failed", ink: "[color:var(--intent-danger)]" },
  }[state];
  return (
    <span className={cn("text-ui-small inline-flex items-center gap-1.5", map.ink, className)}>
      <span className="[&_svg]:size-[var(--icon-sm)]">{map.icon}</span>
      {map.label}
      {at && state === "synced" ? (
        <span className="[color:var(--content-disabled)]">· {at}</span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------- ConnectionCard */

export function ConnectionCard({
  name,
  dialect,
  host,
  environment,
  state,
  actions,
  onClick,
  className,
}: {
  name: ReactNode;
  dialect: ReactNode;
  host: ReactNode;
  environment?: string;
  state: ConnState;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group border-border-default bg-surface-panel hover:border-border-strong flex items-center gap-3 rounded-[var(--radius-panel)] border p-3.5 transition-colors",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-control)] text-left"
      >
        <span className="border-border-default bg-surface-canvas grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border text-ui-caption [color:var(--content-tertiary)] font-mono uppercase">
          {String(dialect).slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-ui-default [color:var(--content-primary)] truncate font-[var(--weight-medium)]">
              {name}
            </span>
            {environment ? <EnvBadge environment={environment} /> : null}
          </span>
          <span className="text-ui-small [color:var(--content-tertiary)] mt-0.5 flex items-center gap-2 truncate">
            <ConnectionStatus state={state} showLabel={false} />
            {host}
          </span>
        </span>
      </button>
      {actions ? (
        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
