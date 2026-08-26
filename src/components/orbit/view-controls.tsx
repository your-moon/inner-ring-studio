"use client";

import { ArrowDownWideNarrow, ArrowUpDown, ArrowUpNarrowWide, Check, Rows3 } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TRIGGER = cn(
  "focus-ring press border-border-default [color:var(--content-secondary)] inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-ui-small whitespace-nowrap",
  "hover:bg-surface-hover data-[state=open]:bg-surface-hover"
);
const ROW = "text-ui-default flex items-center gap-2";

export type ViewOption = { value: string; label: ReactNode };

/* -------------------------------------------------------------- SortBuilder */

export function SortBuilder({
  fields,
  field,
  direction,
  onFieldChange,
  onDirectionChange,
}: {
  fields: ViewOption[];
  field: string;
  direction: "asc" | "desc";
  onFieldChange: (value: string) => void;
  onDirectionChange: (direction: "asc" | "desc") => void;
}) {
  const current = fields.find((f) => f.value === field);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Sort">
        <ArrowUpDown className="size-3.5" />
        {current?.label ?? "Sort"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {fields.map((f) => (
          <DropdownMenuItem key={f.value} onSelect={() => onFieldChange(f.value)} className={ROW}>
            <span className="flex-1">{f.label}</span>
            {f.value === field ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDirectionChange("asc")} className={ROW}>
          <ArrowUpNarrowWide className="size-4" />
          <span className="flex-1">Ascending</span>
          {direction === "asc" ? <Check className="size-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDirectionChange("desc")} className={ROW}>
          <ArrowDownWideNarrow className="size-4" />
          <span className="flex-1">Descending</span>
          {direction === "desc" ? <Check className="size-3.5" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------ GroupByPicker */

export function GroupByPicker({
  options,
  value,
  onChange,
}: {
  options: ViewOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Group by">
        <Rows3 className="size-3.5" />
        Group: {current?.label ?? "None"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => onChange(o.value)} className={ROW}>
            <span className="flex-1">{o.label}</span>
            {o.value === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------------------------------------- SavedViewPicker */

export type SavedView = { value: string; label: ReactNode };

export function SavedViewPicker({
  views,
  value,
  onChange,
  onSaveNew,
}: {
  views: SavedView[];
  value: string;
  onChange: (value: string) => void;
  onSaveNew?: () => void;
}) {
  const current = views.find((v) => v.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Saved views"
        className="focus-ring press [color:var(--content-primary)] inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-ui-default font-[var(--weight-medium)] hover:bg-surface-hover data-[state=open]:bg-surface-hover"
      >
        {current?.label ?? "View"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {views.map((v) => (
          <DropdownMenuItem key={v.value} onSelect={() => onChange(v.value)} className={ROW}>
            <span className="flex-1">{v.label}</span>
            {v.value === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
        {onSaveNew ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSaveNew} className="text-ui-default [color:var(--content-link)]">
              Save current as view…
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
