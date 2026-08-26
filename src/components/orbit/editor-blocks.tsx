"use client";

import { CaretRight, Check } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Rich-text block types for the editor, modelled on Linear's document blocks:
 * quote, collapsible toggle, to-do, bullet/numbered lists, and a code-block
 * header. Presentational — wire to your editor's block state.
 */

/* ------------------------------------------------------------------- QuoteBlock */

/** A blockquote: a left rule with muted body text. */
export function QuoteBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <blockquote
      className={cn(
        "border-border-strong text-body border-l-2 pl-3 [color:var(--content-secondary)]",
        className
      )}
    >
      {children}
    </blockquote>
  );
}

/* ------------------------------------------------------------------ ToggleBlock */

/** A collapsible toggle block: a disclosure caret + summary over hidden body. */
export function ToggleBlock({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-body group/tg flex items-start gap-1.5 text-left [color:var(--content-primary)]"
      >
        <CaretRight
          className={cn(
            "mt-1 size-3.5 shrink-0 [color:var(--content-tertiary)] transition-transform duration-[var(--motion-fast)]",
            open && "rotate-90"
          )}
        />
        <span className="min-w-0 flex-1">{summary}</span>
      </button>
      {open ? (
        <div className="text-body mt-1 pl-5 [color:var(--content-secondary)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------- TodoItem */

/** A to-do list item: a checkbox with text that strikes through when done. */
export function TodoItem({
  checked,
  onCheckedChange,
  children,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "text-body flex cursor-pointer items-start gap-2 [color:var(--content-primary)]",
        className
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "focus-ring mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors [&_svg]:size-3",
          checked
            ? "border-primary bg-primary [color:var(--primary-foreground)]"
            : "border-border-strong hover:border-[var(--content-tertiary)]"
        )}
      >
        {checked ? <Check weight="bold" /> : null}
      </button>
      <span
        className={cn(
          "min-w-0 flex-1",
          checked && "[color:var(--content-tertiary)] line-through"
        )}
      >
        {children}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------- ListBlock */

/** A bullet or numbered list with Linear's spacing and markers. */
export function ListBlock({
  ordered = false,
  children,
  className,
}: {
  ordered?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Comp = ordered ? "ol" : "ul";
  return (
    <Comp
      className={cn(
        "text-body flex flex-col gap-1 pl-5 [color:var(--content-primary)] marker:[color:var(--content-tertiary)]",
        ordered ? "list-decimal" : "list-disc",
        className
      )}
    >
      {children}
    </Comp>
  );
}

/* -------------------------------------------------------------- CodeBlockHeader */

/** The header strip above a fenced code block: a language label + copy action. */
export function CodeBlockHeader({
  language = "text",
  action,
  className,
}: {
  language?: ReactNode;
  /** Trailing control, e.g. a <CopyButton>. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-subtle bg-surface-canvas flex h-8 items-center justify-between rounded-t-[var(--radius-control)] border border-b-0 px-2.5",
        className
      )}
    >
      <span className="text-ui-caption [color:var(--content-tertiary)] font-[var(--weight-medium)] lowercase">
        {language}
      </span>
      {action}
    </div>
  );
}
