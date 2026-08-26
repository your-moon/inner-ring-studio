"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

const TRIGGER_CLASS = cn(
  // crisp text-input root: 32px, 8px radius, hairline ring; the recipe's
  // ::after draws the focus and invalid rings (data-invalid below).
  "seed-text-input__root seed-text-input__root--variant_outline seed-text-input__root--variant_outline-size_medium",
  "flex h-8 w-full items-center justify-between gap-2 px-2.5 text-[14px] [color:var(--content-primary)] outline-hidden",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

function CommandShell({
  searchPlaceholder,
  emptyLabel,
  children,
}: {
  searchPlaceholder: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <Command
      className="overflow-hidden"
      filter={(value, search, keywords) => {
        const haystack = `${value} ${keywords?.join(" ") ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase()) ? 1 : 0;
      }}
    >
      {/* Attio-measured: 40px search row, 10px inline padding, hairline divider. */}
      <div className="border-border-subtle flex h-10 items-center gap-2 border-b px-2.5">
        <Search className="size-[var(--icon-sm)] shrink-0 [color:var(--content-tertiary)]" />
        <Command.Input
          placeholder={searchPlaceholder}
          className="h-full w-full bg-transparent text-[14px] [color:var(--content-primary)] placeholder:[color:var(--content-tertiary)] focus:outline-none"
        />
      </div>
      <Command.List className="max-h-64 overflow-y-auto p-1">
        <Command.Empty className="text-ui-small [color:var(--content-tertiary)] px-2 py-6 text-center">
          {emptyLabel}
        </Command.Empty>
        {children}
      </Command.List>
    </Command>
  );
}

function optionRowClass() {
  return cn(
    "relative flex min-h-8 cursor-default items-center gap-2 rounded-[var(--seed-radius-r2)] px-2 text-[14px] leading-5 font-medium outline-none select-none",
    "[color:var(--seed-color-fg-neutral)]",
    // cmdk marks the active row with data-selected
    "data-[selected=true]:bg-[var(--seed-color-bg-layer-floating-pressed)]"
  );
}

export type ComboboxProps = {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Searchable single-select. Use Select for short, static option sets. */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
  invalid = false,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const field = useFieldControl();
  const selected = options.find((o) => o.value === value) ?? null;
  const isInvalid = invalid || field["aria-invalid"] === true;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...field}
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        className={cn(
          TRIGGER_CLASS,
          className
        )}
        data-invalid={isInvalid || undefined}
      >
        <span
          className={cn(
            "truncate",
            !selected && "[color:var(--content-tertiary)]"
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-[var(--icon-sm)] shrink-0 [color:var(--content-tertiary)]" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "seed-menu__content seed-menu__content--size_small",
          "w-[--radix-popover-trigger-width] min-w-[220px] border-0 p-0"
        )}
      >
        <CommandShell
          searchPlaceholder={searchPlaceholder}
          emptyLabel={emptyLabel}
        >
          {options.map((option) => (
            <Command.Item
              key={option.value}
              value={option.value}
              keywords={[option.label]}
              onSelect={() => {
                onChange(option.value === value ? null : option.value);
                setOpen(false);
              }}
              className={optionRowClass()}
            >
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  option.value === value ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </Command.Item>
          ))}
        </CommandShell>
      </PopoverContent>
    </Popover>
  );
}

export type MultiSelectProps = {
  options: ComboboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Searchable multi-select with removable chips in the trigger. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
  invalid = false,
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const field = useFieldControl();
  const selected = options.filter((o) => value.includes(o.value));
  const isInvalid = invalid || field["aria-invalid"] === true;

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...field}
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        className={cn(
          TRIGGER_CLASS,
          "h-auto min-h-8 flex-wrap py-1",
          className
        )}
        data-invalid={isInvalid || undefined}
      >
        <span className="flex flex-1 flex-wrap items-center gap-1">
          {selected.length === 0 ? (
            <span className="[color:var(--content-tertiary)]">
              {placeholder}
            </span>
          ) : (
            selected.map((option) => (
              <span
                key={option.value}
                className="bg-surface-hover text-ui-small inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${option.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(option.value);
                  }}
                  className="[color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronsUpDown className="size-[var(--icon-sm)] shrink-0 self-center [color:var(--content-tertiary)]" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "seed-menu__content seed-menu__content--size_small",
          "w-[--radix-popover-trigger-width] min-w-[220px] border-0 p-0"
        )}
      >
        <CommandShell
          searchPlaceholder={searchPlaceholder}
          emptyLabel={emptyLabel}
        >
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <Command.Item
                key={option.value}
                value={option.value}
                keywords={[option.label]}
                onSelect={() => toggle(option.value)}
                className={optionRowClass()}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-[6px] border",
                    checked
                      ? "border-transparent bg-[var(--seed-color-bg-brand-solid)] text-white"
                      : "border-[var(--seed-color-stroke-neutral-muted)]"
                  )}
                >
                  {checked ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </Command.Item>
            );
          })}
        </CommandShell>
      </PopoverContent>
    </Popover>
  );
}
