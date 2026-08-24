"use client";

import {
  CheckCircle,
  Info,
  Warning,
  WarningOctagon,
  X,
  type Icon,
} from "@phosphor-icons/react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";
import { Loader } from "./loader";

/* ------------------------------------------------------------------ Alert */

type Intent = "info" | "success" | "warning" | "danger" | "neutral";

const ALERT_INTENT: Record<
  Intent,
  { icon: Icon; fill: string; ink: string }
> = {
  info: { icon: Info, fill: "bg-[var(--intent-info-soft)]", ink: "[color:var(--intent-info)]" },
  success: { icon: CheckCircle, fill: "bg-[var(--intent-success-soft)]", ink: "[color:var(--intent-success)]" },
  warning: { icon: Warning, fill: "bg-[var(--intent-warning-soft)]", ink: "[color:var(--intent-warning)]" },
  danger: { icon: WarningOctagon, fill: "bg-[var(--intent-danger-soft)]", ink: "[color:var(--intent-danger)]" },
  neutral: { icon: Info, fill: "bg-surface-selected", ink: "[color:var(--content-secondary)]" },
};

export type AlertProps = {
  intent?: Intent;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

/**
 * An inline banner that explains a state and, when it matters, offers the one
 * action to resolve it. Icon + intent color reinforce, but the words carry the
 * meaning. Reserve `danger` for real failures.
 */
export function Alert({
  intent = "info",
  title,
  children,
  action,
  onDismiss,
  className,
}: AlertProps) {
  const { icon: Glyph, fill, ink } = ALERT_INTENT[intent];
  return (
    <div
      role={intent === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-[var(--radius-panel)] p-3.5",
        fill,
        className
      )}
    >
      <Glyph weight="fill" className={cn("mt-px size-[var(--icon-md)] shrink-0", ink)} />
      <div className="min-w-0 flex-1">
        {title ? (
          <div className="text-ui-default [color:var(--content-primary)] font-[var(--weight-medium)]">
            {title}
          </div>
        ) : null}
        {children ? (
          <div className="text-ui-small [color:var(--content-secondary)]">
            {children}
          </div>
        ) : null}
        {action ? <div className="mt-2.5 flex gap-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton
          aria-label="Dismiss"
          size="sm"
          className="-mt-1 -mr-1"
          onClick={onDismiss}
        >
          <X />
        </IconButton>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Callout */

export type CalloutProps = {
  intent?: Intent;
  children: ReactNode;
  className?: string;
};

/** A quieter aside — a left accent rule, no fill. For tips and context, not
 * state changes (use Alert for those). */
export function Callout({ intent = "neutral", children, className }: CalloutProps) {
  const accent =
    intent === "neutral"
      ? "border-border-strong"
      : intent === "info"
        ? "border-[var(--intent-info)]"
        : intent === "success"
          ? "border-[var(--intent-success)]"
          : intent === "warning"
            ? "border-[var(--intent-warning)]"
            : "border-[var(--intent-danger)]";
  return (
    <div
      className={cn(
        "text-ui-small [color:var(--content-secondary)] border-l-2 py-1 pl-3",
        accent,
        className
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- Skeleton */

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** A loading placeholder shaped like the content it stands in for. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-surface-selected animate-pulse rounded-[var(--radius-small)]",
        className
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- Progress */

export type ProgressProps = {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number;
  label?: string;
  className?: string;
};

/** A slim determinate or indeterminate progress bar. */
export function Progress({ value, label, className }: ProgressProps) {
  const indeterminate = value == null;
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : clamped}
      className={cn(
        "bg-surface-selected h-1.5 w-full overflow-hidden rounded-[var(--radius-full)]",
        className
      )}
    >
      <div
        className={cn(
          "bg-primary h-full rounded-[var(--radius-full)]",
          indeterminate
            ? "w-1/3 animate-[orbit-progress_1.1s_ease-in-out_infinite]"
            : "transition-[width] duration-300 ease-out"
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Spinner */

export type SpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

/** An accessible spinner over the shared Loader glyph. */
export function Spinner({ size = 16, label = "Loading", className }: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex", className)}>
      <Loader size={size} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
