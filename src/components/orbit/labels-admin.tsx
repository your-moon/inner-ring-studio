"use client";

import { CaretRight, Check, Plus } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./input";
import { LABEL_COLORS, type LabelColor } from "./tag";

/*
 * Settings › Labels management. Ground-truthed on linear.app/settings/labels:
 * a 44px label row (9px colour dot · name · description · updated date) and the
 * fixed colour palette (LABEL_COLORS — red/blue verified identical to Linear).
 */

/* ------------------------------------------------------------------- LabelRow */

export type LabelRowProps = {
  name: ReactNode;
  color?: LabelColor;
  description?: ReactNode;
  /** Trailing metadata (e.g. "Updated 2 days ago"). */
  meta?: ReactNode;
  /** Hover actions (edit / delete). */
  actions?: ReactNode;
  className?: string;
};

/** A workspace label row: colour dot, name, description and trailing meta. */
export function LabelRow({
  name,
  color = "gray",
  description,
  meta,
  actions,
  className,
}: LabelRowProps) {
  return (
    <div
      className={cn(
        "group/label flex min-h-[44px] items-center gap-2.5 py-2",
        className
      )}
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: LABEL_COLORS[color] }}
      />
      <div className="min-w-0 flex-1">
        <span className="text-ui-default [color:var(--content-primary)]">
          {name}
        </span>
        {description ? (
          <span className="text-ui-small ml-2 [color:var(--content-tertiary)]">
            {description}
          </span>
        ) : null}
      </div>
      {meta ? (
        <span className="text-ui-small hidden shrink-0 [color:var(--content-tertiary)] sm:block">
          {meta}
        </span>
      ) : null}
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/label:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- LabelGroupRow */

export type LabelGroupRowProps = {
  name: ReactNode;
  count?: number;
  color?: LabelColor;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: ReactNode;
  className?: string;
};

/** A label group: a collapsible parent that nests member labels. */
export function LabelGroupRow({
  name,
  count,
  color = "gray",
  defaultOpen = true,
  onAdd,
  children,
  className,
}: LabelGroupRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="group/grp flex min-h-[44px] items-center gap-1.5 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-ui-default flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <CaretRight
            className={cn(
              "size-3.5 shrink-0 [color:var(--content-tertiary)] transition-transform duration-[var(--motion-fast)]",
              open && "rotate-90"
            )}
          />
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: LABEL_COLORS[color] }}
          />
          <span className="[color:var(--content-primary)] font-[var(--weight-medium)]">
            {name}
          </span>
          {count != null ? (
            <span className="text-ui-small [color:var(--content-tertiary)]">
              {count}
            </span>
          ) : null}
        </button>
        {onAdd ? (
          <button
            type="button"
            aria-label={`Add label to ${typeof name === "string" ? name : "group"}`}
            onClick={onAdd}
            className="focus-ring grid size-6 shrink-0 place-items-center rounded-[var(--radius-control)] opacity-0 [color:var(--content-tertiary)] group-hover/grp:opacity-100 hover:bg-surface-hover [&_svg]:size-4"
          >
            <Plus />
          </button>
        ) : null}
      </div>
      {open ? <div className="flex flex-col pl-6">{children}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------- ColorSwatchPicker */

const SWATCH_ORDER = Object.keys(LABEL_COLORS) as LabelColor[];

/** The fixed label-colour palette as a selectable swatch grid. */
export function ColorSwatchPicker({
  value,
  onChange,
  className,
}: {
  value: LabelColor;
  onChange: (color: LabelColor) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Label color"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {SWATCH_ORDER.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "focus-ring relative grid size-6 place-items-center rounded-full",
            c === value && "ring-2 ring-offset-2 ring-offset-[var(--surface-panel)]"
          )}
          style={c === value ? { ["--tw-ring-color" as string]: LABEL_COLORS[c] } : undefined}
        >
          <span
            aria-hidden
            className="size-3.5 rounded-full"
            style={{ backgroundColor: LABEL_COLORS[c] }}
          />
          {c === value ? (
            <Check
              weight="bold"
              className="absolute size-3 [color:var(--primary-foreground)] mix-blend-difference"
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ LabelForm */

/** Inline create/edit form: a name field, the colour palette, and submit. */
export function LabelForm({
  name,
  onNameChange,
  color,
  onColorChange,
  onSubmit,
  onCancel,
  submitLabel = "Create label",
  className,
}: {
  name: string;
  onNameChange: (name: string) => void;
  color: LabelColor;
  onColorChange: (color: LabelColor) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn(
        "border-border-default bg-surface-panel flex flex-col gap-3 rounded-[var(--radius-panel)] border p-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: LABEL_COLORS[color] }}
        />
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Label name"
          aria-label="Label name"
          className="flex-1"
        />
      </div>
      <ColorSwatchPicker value={color} onChange={onColorChange} />
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button variant="secondary" size="sm" title="Cancel" onClick={onCancel} />
        ) : null}
        <Button
          variant="primary"
          size="sm"
          type="submit"
          title={submitLabel}
          disabled={!name.trim()}
        />
      </div>
    </form>
  );
}
