"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import type { InputHTMLAttributes, ReactNode } from "react";

import Kbd from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

/*
 * The ⌘K command palette shell — the visual container Linear opens over any
 * screen. Rows are the existing <CommandRow> (6px radius); the frame uses the
 * verified menu radius (--radius-menu, 12px) and menu shadow.
 *
 * This is presentational: wire it to cmdk (see <Combobox>) or your own state.
 */

/* ----------------------------------------------------------------- CommandMenu */

export type CommandMenuProps = {
  /** Rendered into the search row; usually a controlled <input>. */
  input?: ReactNode;
  children: ReactNode;
  /** The keyboard-hint bar pinned to the bottom. */
  footer?: ReactNode;
  className?: string;
};

/** The palette frame: a search header, a scrollable body, an optional footer. */
export function CommandMenu({
  input,
  children,
  footer,
  className,
}: CommandMenuProps) {
  return (
    <div
      role="dialog"
      aria-label="Command menu"
      className={cn(
        "border-border-default bg-surface-overlay flex w-[640px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[var(--radius-menu)] border shadow-[var(--shadow-menu)]",
        className
      )}
    >
      <div className="border-border-subtle flex h-12 shrink-0 items-center gap-2.5 border-b px-3.5">
        <MagnifyingGlass className="size-[var(--icon-md)] shrink-0 [color:var(--content-tertiary)]" />
        {input ?? <CommandInput />}
      </div>
      <div className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain p-1.5">
        {children}
      </div>
      {footer}
    </div>
  );
}

/* ---------------------------------------------------------------- CommandInput */

/** The unstyled search field for the palette header (borderless, fills the row). */
export function CommandInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      autoComplete="off"
      placeholder="Type a command or search…"
      className={cn(
        "text-body min-w-0 flex-1 bg-transparent [color:var(--content-primary)] outline-none placeholder:[color:var(--content-tertiary)]",
        className
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------- CommandGroup */

export type CommandGroupProps = {
  heading?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** A titled section of command rows. */
export function CommandGroup({
  heading,
  children,
  className,
}: CommandGroupProps) {
  return (
    <div className={cn("pb-1 last:pb-0", className)}>
      {heading != null ? (
        <div className="text-ui-caption px-2 pt-2 pb-1 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
          {heading}
        </div>
      ) : null}
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- CommandEmpty */

/** The quiet "no results" state inside the palette body. */
export function CommandEmpty({
  children = "No results found.",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-ui-small px-2 py-8 text-center [color:var(--content-tertiary)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- CommandFooter */

export type CommandHint = { keys: ReactNode; label: ReactNode };

/** The keyboard-hint bar pinned to the palette bottom. */
export function CommandFooter({
  hints = DEFAULT_HINTS,
  className,
}: {
  hints?: CommandHint[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-subtle flex h-9 shrink-0 items-center gap-3.5 border-t px-3.5",
        className
      )}
    >
      {hints.map((h, i) => (
        <span
          key={i}
          className="text-ui-caption flex items-center gap-1.5 [color:var(--content-tertiary)]"
        >
          <span className="flex items-center gap-0.5">{h.keys}</span>
          {h.label}
        </span>
      ))}
    </div>
  );
}

const DEFAULT_HINTS: CommandHint[] = [
  { keys: <Kbd>↑↓</Kbd>, label: "Navigate" },
  { keys: <Kbd>↵</Kbd>, label: "Open" },
  { keys: <Kbd>esc</Kbd>, label: "Close" },
];
