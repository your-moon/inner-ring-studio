"use client";

import { Smile } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/* ----------------------------------------------------------------- Reactions */

export type Reaction = { emoji: string; count: number; reacted?: boolean };

/** Linear's emoji reaction pills + an add-reaction button. */
export function Reactions({
  reactions,
  onToggle,
  onAdd,
  className,
}: {
  reactions: Reaction[];
  onToggle?: (emoji: string) => void;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle?.(r.emoji)}
          aria-pressed={r.reacted}
          className={cn(
            "focus-ring inline-flex h-6 items-center gap-1 rounded-[var(--radius-full)] border px-2 text-ui-small [font-variant-numeric:tabular-nums]",
            r.reacted
              ? "border-primary bg-[var(--intent-accent-soft)] [color:var(--intent-accent)]"
              : "border-border-default [color:var(--content-secondary)] hover:bg-surface-hover"
          )}
        >
          <span>{r.emoji}</span>
          {r.count}
        </button>
      ))}
      {onAdd ? (
        <button
          type="button"
          aria-label="Add reaction"
          onClick={onAdd}
          className="focus-ring border-border-default [color:var(--content-tertiary)] grid size-6 place-items-center rounded-[var(--radius-full)] border hover:bg-surface-hover hover:[color:var(--content-primary)]"
        >
          <Smile className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- CommentComposer */

function Initial({ name }: { name: string }) {
  return (
    <span className="bg-surface-hover [color:var(--content-secondary)] grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-[var(--weight-semibold)] leading-none">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Linear's comment box: avatar + growing textarea + submit. */
export function CommentComposer({
  author,
  onSubmit,
  placeholder = "Leave a comment…",
  className,
}: {
  author: string;
  onSubmit: (body: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [body, setBody] = useState("");
  const submit = () => {
    const b = body.trim();
    if (!b) return;
    onSubmit(b);
    setBody("");
  };
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Initial name={author} />
      <div className="focus-within:border-border-focus border-border-default bg-surface-canvas min-w-0 flex-1 rounded-[var(--radius-panel)] border p-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder={placeholder}
          aria-label="Comment"
          className="text-ui-default min-h-[40px] w-full resize-none bg-transparent [color:var(--content-primary)] placeholder:[color:var(--content-tertiary)] focus:outline-none"
        />
        <div className="mt-1 flex justify-end">
          <Button
            variant="primary"
            size="sm"
            title="Comment"
            disabled={!body.trim()}
            onClick={submit}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- CommentItem */

/** A posted comment: avatar, author, time, and the body. */
export function CommentItem({
  author,
  time,
  children,
  footer,
  className,
}: {
  author: string;
  time?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Initial name={author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-ui-default [color:var(--content-primary)] font-[var(--weight-medium)]">
            {author}
          </span>
          {time ? (
            <span className="text-ui-caption [color:var(--content-tertiary)]">
              {time}
            </span>
          ) : null}
        </div>
        <div className="text-ui-default [color:var(--content-secondary)] mt-0.5">
          {children}
        </div>
        {footer ? <div className="mt-1.5">{footer}</div> : null}
      </div>
    </div>
  );
}
