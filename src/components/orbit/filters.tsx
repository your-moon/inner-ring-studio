"use client";

import { Plus, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------- FilterChip */

export type FilterChipProps = {
  field: ReactNode;
  operator?: ReactNode;
  value: ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
};

/** One applied filter as a removable pill: field · operator · value ×. */
export function FilterChip({
  field,
  operator = "is",
  value,
  onRemove,
  onClick,
}: FilterChipProps) {
  return (
    <span className="border-border-default bg-surface-panel inline-flex h-7 items-center overflow-hidden rounded-[var(--radius-full)] border text-ui-small">
      <button
        type="button"
        onClick={onClick}
        className="focus-ring flex h-full items-center gap-1.5 px-2.5 hover:bg-surface-hover"
      >
        <span className="[color:var(--content-tertiary)]">{field}</span>
        <span className="[color:var(--content-disabled)]">{operator}</span>
        <span className="[color:var(--content-primary)] font-[var(--weight-medium)]">
          {value}
        </span>
      </button>
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove filter"
          onClick={onRemove}
          className="focus-ring border-border-subtle flex h-full items-center border-l px-1.5 [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

/* ----------------------------------------------------------- FilterBuilder */

export type FilterField = { value: string; label: ReactNode; icon?: ReactNode };

/** The "+ Filter" pill: opens a field menu; picking a field calls onAddField. */
export function FilterBuilder({
  fields,
  onAddField,
  label = "Filter",
}: {
  fields: FilterField[];
  onAddField: (field: string) => void;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Add filter"
        className="focus-ring press border-border-default [color:var(--content-secondary)] inline-flex h-7 items-center gap-1 rounded-[var(--radius-full)] border border-dashed px-2.5 text-ui-small hover:bg-surface-hover hover:[color:var(--content-primary)] data-[state=open]:bg-surface-hover"
      >
        <Plus className="size-3" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {fields.map((f) => (
          <DropdownMenuItem
            key={f.value}
            onSelect={() => onAddField(f.value)}
            className="text-ui-default flex items-center gap-2"
          >
            {f.icon ? (
              <span className="[color:var(--content-tertiary)] [&_svg]:size-[var(--icon-sm)]">
                {f.icon}
              </span>
            ) : null}
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------------------------------------- AppliedFilters */

/** The filter bar: applied chips followed by the + Filter pill. */
export function AppliedFilters({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------- DisplayOptions */

/** The "Display" popover: grouping, ordering, and toggles for a view. */
export function DisplayOptions({
  children,
  label = "Display",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Display options"
        className="focus-ring press border-border-default [color:var(--content-secondary)] inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-ui-small hover:bg-surface-hover data-[state=open]:bg-surface-hover"
      >
        <SlidersHorizontal className="size-3.5" />
        {label}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="flex flex-col gap-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function DisplayOptionRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ui-small [color:var(--content-secondary)]">
        {label}
      </span>
      {children}
    </div>
  );
}
