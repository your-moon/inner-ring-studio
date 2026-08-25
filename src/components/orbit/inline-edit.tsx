"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

export type InlineEditProps = {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Edit-in-place text: reads as a label until clicked, then becomes an input.
 * Enter or blur commits, Escape reverts. For a table cell or a title that the
 * user renames without leaving the page.
 */
export function InlineEdit({
  value,
  onCommit,
  placeholder = "Empty",
  className,
  ...props
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    else if (e.key === "Escape") cancel();
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={cn(
          "focus-ring text-ui-default -mx-1.5 -my-0.5 rounded-[var(--radius-control)] border border-border-focus bg-surface-canvas px-1.5 py-0.5 [color:var(--content-primary)]",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        "focus-ring text-ui-default -mx-1.5 -my-0.5 rounded-[var(--radius-control)] px-1.5 py-0.5 text-left hover:bg-surface-hover",
        value ? "[color:var(--content-primary)]" : "[color:var(--content-tertiary)]",
        className
      )}
    >
      {value || placeholder}
    </button>
  );
}
