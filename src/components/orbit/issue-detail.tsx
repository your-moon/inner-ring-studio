"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowsOutSimple, X } from "@phosphor-icons/react";
import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";
import { ProgressDonut } from "./progress-viz";

/* ------------------------------------------------------------------ PeekModal */

export const PeekModal = DialogPrimitive.Root;
export const PeekModalTrigger = DialogPrimitive.Trigger;

/** Linear's issue peek: a wide right-anchored overlay that opens a record
 * without leaving the list. Header (title + actions), scrolling body, aside. */
export const PeekModalContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: ReactNode;
    aside?: ReactNode;
    onExpand?: () => void;
  }
>(function PeekModalContent(
  { title, aside, onExpand, className, children, ...props },
  ref
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[orbit-overlay-in_var(--motion-base)_var(--ease-out)_both] data-[state=closed]:animate-[orbit-overlay-out_var(--motion-fast)_var(--ease-out)_both] motion-reduce:animate-none" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "bg-surface-panel fixed inset-y-0 right-0 z-50 flex w-[720px] max-w-[94vw] flex-col border-l border-border-default shadow-[var(--shadow-modal)]",
          "data-[state=open]:animate-[orbit-sheet-in-right_var(--motion-base)_var(--ease-in-out-cubic)_both] data-[state=closed]:animate-[orbit-sheet-out-right_var(--motion-base)_var(--ease-in-out-cubic)_both] motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        <div className="border-border-subtle flex h-11 shrink-0 items-center gap-2 border-b px-3">
          <DialogPrimitive.Title className="text-ui-default [color:var(--content-primary)] min-w-0 flex-1 truncate font-[var(--weight-medium)]">
            {title}
          </DialogPrimitive.Title>
          {onExpand ? (
            <IconButton aria-label="Open full page" size="sm" onClick={onExpand}>
              <ArrowsOutSimple />
            </IconButton>
          ) : null}
          <DialogPrimitive.Close asChild>
            <IconButton aria-label="Close peek" size="sm">
              <X />
            </IconButton>
          </DialogPrimitive.Close>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto p-5">{children}</div>
          {aside ? (
            <aside className="border-border-subtle w-60 shrink-0 overflow-y-auto border-l p-4">
              {aside}
            </aside>
          ) : null}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

/* ---------------------------------------------------------------- SubIssueList */

/** A parent's sub-issues: a donut-headed, collapsible list of child rows. */
export function SubIssueList({
  done,
  total,
  children,
  defaultOpen = true,
}: {
  done: number;
  total: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring text-ui-small [color:var(--content-secondary)] flex h-8 items-center gap-2 rounded-[var(--radius-control)] px-1 hover:bg-surface-hover"
      >
        <ProgressDonut value={done} total={total} />
        Sub-issues
        <span className="[color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
          {done}/{total}
        </span>
      </button>
      {open ? (
        <div className="border-border-subtle divide-border-subtle ml-2 divide-y border-l pl-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- RelationRow */

export type RelationKind = "blocks" | "blocked-by" | "related" | "duplicate";

const RELATION_LABEL: Record<RelationKind, string> = {
  blocks: "Blocks",
  "blocked-by": "Blocked by",
  related: "Related to",
  duplicate: "Duplicate of",
};

/** An issue relation row: kind label + issue id/title + remove. */
export function RelationRow({
  kind,
  id,
  title,
  onRemove,
}: {
  kind: RelationKind;
  id: ReactNode;
  title: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="group flex h-9 items-center gap-2 text-ui-small">
      <span className="[color:var(--content-tertiary)] w-24 shrink-0">
        {RELATION_LABEL[kind]}
      </span>
      <span className="[color:var(--content-tertiary)] shrink-0 font-mono">{id}</span>
      <span className="[color:var(--content-primary)] min-w-0 flex-1 truncate">
        {title}
      </span>
      {onRemove ? (
        <IconButton
          aria-label="Remove relation"
          size="sm"
          className="opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <X />
        </IconButton>
      ) : null}
    </div>
  );
}
