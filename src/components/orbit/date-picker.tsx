"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type DatePickerProps = {
  value: Date | null;
  onChange: (value: Date) => void;
  placeholder?: string;
  className?: string;
};

/**
 * A calendar date picker in a popover, modelled on Linear's due-date control.
 * For a raw native input use DateField instead.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const field = useFieldControl();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => value ?? new Date());

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...field}
        className={cn(
          "focus-ring flex h-8 w-full items-center justify-between rounded-[var(--radius-control)] border border-border-default bg-surface-canvas px-2.5 text-ui-default data-[state=open]:border-border-focus",
          className
        )}
      >
        <span className={cn(!value && "[color:var(--content-tertiary)]")}>
          {value
            ? value.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="border-border-default bg-surface-overlay w-64 rounded-[var(--radius-menu)] p-3 shadow-[var(--shadow-menu)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setView(new Date(year, month - 1, 1))}
            className="focus-ring grid size-6 place-items-center rounded-[6px] hover:bg-surface-hover [color:var(--content-tertiary)]"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-ui-small font-[var(--weight-medium)]">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setView(new Date(year, month + 1, 1))}
            className="focus-ring grid size-6 place-items-center rounded-[6px] hover:bg-surface-hover [color:var(--content-tertiary)]"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((d, i) => (
            <span
              key={i}
              className="text-ui-caption [color:var(--content-disabled)] grid h-7 place-items-center"
            >
              {d}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={i} />;
            const date = new Date(year, month, day);
            const selected = value && sameDay(date, value);
            const isToday = sameDay(date, today);
            return (
              <button
                key={i}
                type="button"
                aria-label={date.toDateString()}
                aria-pressed={selected || undefined}
                onClick={() => {
                  onChange(date);
                  setOpen(false);
                }}
                className={cn(
                  "focus-ring text-ui-small grid h-7 place-items-center rounded-[6px] [font-variant-numeric:tabular-nums]",
                  selected
                    ? "bg-primary [color:var(--primary-foreground)]"
                    : "hover:bg-surface-hover [color:var(--content-secondary)]",
                  isToday && !selected && "[color:var(--intent-accent)] font-[var(--weight-semibold)]"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
