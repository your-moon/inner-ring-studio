"use client";

import { DotsSixVertical, Plus } from "@phosphor-icons/react";
import {
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

/*
 * Rich-text editor chrome, modelled on Linear's document/description editor.
 * Uses the verified overlay surface + menu shadow and the 6/8px control radii.
 * (Floating toolbar/blocks modelled on Linear's editor conventions — the
 * workspace had no description to pixel-capture the live toolbar.)
 */

/* ------------------------------------------------------------ EditorToolbarButton */

export type EditorToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  /** Active/applied mark (bold on, etc.). */
  active?: boolean;
};

/** A single format control in the floating toolbar. */
export function EditorToolbarButton({
  active,
  className,
  children,
  ...props
}: EditorToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "focus-ring grid size-7 place-items-center rounded-[6px] [&_svg]:size-4",
        active
          ? "bg-surface-hover [color:var(--content-link)]"
          : "[color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------- FloatingFormatToolbar */

/** The selection format bar: a compact elevated pill of toolbar controls. */
export function FloatingFormatToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className={cn(
        "border-border-default bg-surface-overlay inline-flex h-9 items-center gap-0.5 rounded-[var(--radius-control)] border px-1 shadow-[var(--shadow-menu)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** A thin vertical divider between toolbar groups. */
export function ToolbarDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("bg-border-default mx-0.5 h-4 w-px", className)}
    />
  );
}

/* ------------------------------------------------------------------- LinkPopover */

/** Set/edit a link URL: an input with Apply, and Remove when already linked. */
export function LinkPopover({
  value,
  onChange,
  onApply,
  onRemove,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
      className={cn(
        "border-border-default bg-surface-overlay flex items-center gap-1.5 rounded-[var(--radius-menu)] border p-1.5 shadow-[var(--shadow-menu)]",
        className
      )}
    >
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste or type a link…"
        aria-label="Link URL"
        className="h-7 w-56"
      />
      <Button type="submit" variant="primary" size="sm" title="Apply" disabled={!value.trim()} />
      {onRemove ? (
        <Button variant="secondary" size="sm" title="Remove" onClick={onRemove} />
      ) : null}
    </form>
  );
}

/* -------------------------------------------------------------- EditorPlaceholder */

/** The empty-document hint shown in an unfocused editor. */
export function EditorPlaceholder({
  children = "Add a description…",
  hint = "Type / for commands",
  className,
}: {
  children?: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-body [color:var(--content-tertiary)] select-none",
        className
      )}
    >
      {children}
      {hint ? (
        <span className="text-ui-small ml-2 [color:var(--content-tertiary)] opacity-70">
          {hint}
        </span>
      ) : null}
    </p>
  );
}

/* ------------------------------------------------------------------- BlockHandle */

/** The hover gutter beside a block: an insert "+" and a drag handle. */
export function BlockHandle({
  onInsert,
  className,
}: {
  onInsert?: () => void;
  className?: string;
}) {
  const [, setDragging] = useState(false);
  return (
    <div
      className={cn(
        "flex items-center opacity-0 transition-opacity group-hover/block:opacity-100",
        className
      )}
    >
      {onInsert ? (
        <button
          type="button"
          aria-label="Insert block"
          onClick={onInsert}
          className="focus-ring grid size-5 place-items-center rounded-[var(--radius-small)] [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)] [&_svg]:size-4"
        >
          <Plus />
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Drag to reorder"
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        className="focus-ring grid size-5 cursor-grab place-items-center rounded-[var(--radius-small)] [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)] [&_svg]:size-4"
      >
        <DotsSixVertical />
      </button>
    </div>
  );
}
