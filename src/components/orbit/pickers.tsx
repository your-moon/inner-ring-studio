"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";

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

import { LABEL_COLORS, type LabelColor } from "./tag";
import { PriorityIcon, type Priority } from "./priority-icon";
import { StatusIcon, type WorkflowStatus } from "./status-icon";

const TRIGGER = cn(
  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-ui-small [color:var(--content-secondary)] whitespace-nowrap",
  "hover:bg-surface-hover data-[state=open]:bg-surface-hover"
);
const ROW = "text-ui-default flex items-center gap-2";

/* ------------------------------------------------------------ StatusPicker */

const STATUSES: { value: WorkflowStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "started", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

export function StatusPicker({
  value,
  onChange,
}: {
  value: WorkflowStatus;
  onChange: (value: WorkflowStatus) => void;
}) {
  const current = STATUSES.find((s) => s.value === value) ?? STATUSES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Change status">
        <StatusIcon status={value} />
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onSelect={() => onChange(s.value)}
            className={ROW}
          >
            <StatusIcon status={s.value} />
            <span className="flex-1">{s.label}</span>
            {s.value === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------------------------------------- PriorityPicker */

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "none", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
}) {
  const current = PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Change priority">
        <PriorityIcon priority={value} />
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {PRIORITIES.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onSelect={() => onChange(p.value)}
            className={ROW}
          >
            <PriorityIcon priority={p.value} />
            <span className="flex-1">{p.label}</span>
            {p.value === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------- LabelPicker */

export type LabelOption = { value: string; label: string; color: LabelColor };

export function LabelPicker({
  options,
  value,
  onChange,
  trigger,
}: {
  options: LabelOption[];
  value: string[];
  onChange: (value: string[]) => void;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TRIGGER} aria-label="Add labels">
        {trigger ?? `${value.length || "Add"} label${value.length === 1 ? "" : "s"}`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="focus-ring text-ui-default flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-surface-hover"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: LABEL_COLORS[o.color] }}
              />
              <span className="min-w-0 flex-1 truncate text-left">{o.label}</span>
              {checked ? <Check className="size-3.5" /> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
