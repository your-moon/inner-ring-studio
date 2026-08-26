"use client";

import { Check, User } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TRIGGER = cn(
  "focus-ring press inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] px-1.5 text-ui-small [color:var(--content-secondary)] whitespace-nowrap",
  "hover:bg-surface-hover data-[state=open]:bg-surface-hover"
);

function Initial({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "bg-surface-hover [color:var(--content-secondary)] grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-[var(--weight-semibold)] leading-none",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export type Person = { id: string; name: string };

/** Linear's assignee menu: avatar rows with a checkmark, plus Unassigned. */
export function AssigneePicker({
  people,
  value,
  onChange,
}: {
  people: Person[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const current = people.find((p) => p.id === value) ?? null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Assignee">
        {current ? (
          <>
            <Initial name={current.name} />
            {current.name}
          </>
        ) : (
          <>
            <span className="border-border-strong grid size-5 place-items-center rounded-full border border-dashed [color:var(--content-tertiary)]">
              <User className="size-3" />
            </span>
            Unassigned
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem onSelect={() => onChange(null)} className="text-ui-default flex items-center gap-2">
          <span className="border-border-strong grid size-5 place-items-center rounded-full border border-dashed [color:var(--content-tertiary)]">
            <User className="size-3" />
          </span>
          <span className="flex-1">Unassigned</span>
          {value === null ? <Check weight="bold" className="size-3.5" /> : null}
        </DropdownMenuItem>
        {people.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => onChange(p.id)} className="text-ui-default flex items-center gap-2">
            <Initial name={p.name} />
            <span className="flex-1">{p.name}</span>
            {p.id === value ? <Check weight="bold" className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Linear's estimate menu: a Fibonacci-ish points scale. */
export function EstimatePicker({
  value,
  onChange,
  scale = [0, 1, 2, 3, 5, 8],
  trigger,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  scale?: number[];
  trigger?: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER} aria-label="Estimate">
        {trigger ?? (value !== null ? `${value} pt` : "Estimate")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        <DropdownMenuItem onSelect={() => onChange(null)} className="text-ui-default flex items-center">
          <span className="flex-1">No estimate</span>
          {value === null ? <Check weight="bold" className="size-3.5" /> : null}
        </DropdownMenuItem>
        {scale.map((n) => (
          <DropdownMenuItem key={n} onSelect={() => onChange(n)} className="text-ui-default flex items-center">
            <span className="flex-1 [font-variant-numeric:tabular-nums]">{n} points</span>
            {n === value ? <Check weight="bold" className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
