"use client";

import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AlertDialog, AlertDialogContent } from "./alert-dialog";
import { CodeBlock } from "./code-block";

/* --------------------------------------------------------------- ColumnTypeBadge */

type TypeFamily = "numeric" | "text" | "boolean" | "temporal" | "json" | "uuid" | "other";

const FAMILY_COLOR: Record<TypeFamily, string> = {
  numeric: "#4ea7fc",
  text: "#8a8f98",
  boolean: "#a855f7",
  temporal: "#f2994a",
  json: "#4cb782",
  uuid: "#4cb7b7",
  other: "#8a8f98",
};

function familyOf(type: string): TypeFamily {
  const t = type.toLowerCase();
  if (/int|serial|numeric|decimal|real|double|float|money/.test(t)) return "numeric";
  if (/char|text|string|clob|citext/.test(t)) return "text";
  if (/bool/.test(t)) return "boolean";
  if (/date|time|timestamp|interval/.test(t)) return "temporal";
  if (/json|jsonb/.test(t)) return "json";
  if (/uuid|guid/.test(t)) return "uuid";
  return "other";
}

/** A column's SQL type as a quiet badge, tinted by type family. */
export function ColumnTypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const color = FAMILY_COLOR[familyOf(type)];
  return (
    <span
      className={cn(
        "border-border-subtle inline-flex h-[18px] shrink-0 items-center gap-1 rounded-[var(--radius-small)] border pr-1.5 pl-1 text-ui-caption [color:var(--content-tertiary)] font-mono",
        className
      )}
    >
      <span className="size-2 rounded-[3px]" style={{ backgroundColor: color }} />
      {type}
    </span>
  );
}

/* --------------------------------------------------- ProductionEnvironmentBanner */

/** The persistent warning that the current target is production. */
export function ProductionEnvironmentBanner({
  children = "You are connected to a production database. Writes affect live data.",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 bg-[var(--intent-warning-soft)] px-3 py-1.5 text-ui-small [color:var(--intent-warning)]",
        className
      )}
    >
      <TriangleAlert fill="currentColor" className="size-[var(--icon-sm)] shrink-0" />
      <span className="[color:var(--content-secondary)]">{children}</span>
    </div>
  );
}

/* --------------------------------------------------------- WriteConfirmationDialog */

/** A blocking confirm before a write/DDL statement runs against a prod target.
 * Shows the exact SQL so the user re-reads it before committing. */
export function WriteConfirmationDialog({
  open,
  onOpenChange,
  sql,
  environment = "production",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  environment?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        title={`Run this against ${environment}?`}
        description="This statement writes to live data and can't be undone. Read it once more."
        confirmLabel="Run statement"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
      >
        <CodeBlock code={sql} copyable={false} className="max-h-40 overflow-auto" />
      </AlertDialogContent>
    </AlertDialog>
  );
}
