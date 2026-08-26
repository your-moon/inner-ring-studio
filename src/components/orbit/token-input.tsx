"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export type TokenInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Keys that finalize the current token. Defaults to Enter and comma. */
  separators?: string[];
  className?: string;
};

/**
 * A tag / token input: type and press Enter (or comma) to add a chip,
 * Backspace on an empty field removes the last. For SQL params, tags, columns.
 */
export function TokenInput({
  value,
  onChange,
  placeholder = "Add…",
  separators = ["Enter", ","],
  className,
}: TokenInputProps) {
  const field = useFieldControl();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const token = raw.trim();
    if (token && !value.includes(token)) onChange([...value, token]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (separators.includes(e.key)) {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "focus-within:border-border-focus border-border-default bg-surface-canvas flex min-h-8 flex-wrap items-center gap-1 rounded-[var(--radius-control)] border px-1.5 py-1",
        className
      )}
    >
      {value.map((token) => (
        <span
          key={token}
          className="bg-surface-hover text-ui-small inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5"
        >
          {token}
          <span
            role="button"
            tabIndex={-1}
            aria-label={`Remove ${token}`}
            onClick={() => onChange(value.filter((t) => t !== token))}
            className="[color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
          >
            <X className="size-3" />
          </span>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="text-ui-default min-w-[6ch] flex-1 bg-transparent [color:var(--content-primary)] placeholder:[color:var(--content-tertiary)] focus:outline-none"
        {...field}
      />
    </div>
  );
}
