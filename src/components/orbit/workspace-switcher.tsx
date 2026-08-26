"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type Workspace = { id: string; name: string };

/** Linear's top-left workspace menu: current workspace + switcher. */
export function WorkspaceSwitcher({
  workspaces,
  activeId,
  onSelect,
  onCreate,
  className,
}: {
  workspaces: Workspace[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate?: () => void;
  className?: string;
}) {
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch workspace"
        className={cn(
          "focus-ring flex h-8 w-full items-center gap-2 rounded-[var(--radius-control)] px-1.5 hover:bg-surface-hover data-[state=open]:bg-surface-hover",
          className
        )}
      >
        <span className="bg-primary [color:var(--primary-foreground)] grid size-5 shrink-0 place-items-center rounded-[var(--radius-small)] text-[10px] font-[var(--weight-semibold)] leading-none">
          {active?.name.charAt(0).toUpperCase()}
        </span>
        <span className="text-ui-default [color:var(--content-primary)] min-w-0 flex-1 truncate text-left font-[var(--weight-medium)]">
          {active?.name}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => onSelect(w.id)}
            className="text-ui-default flex items-center gap-2"
          >
            <span className="bg-surface-hover [color:var(--content-secondary)] grid size-5 place-items-center rounded-[var(--radius-small)] text-[10px] font-[var(--weight-semibold)] leading-none">
              {w.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === activeId ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
        {onCreate ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onCreate} className="text-ui-default flex items-center gap-2 [color:var(--content-secondary)]">
              <Plus className="size-4" />
              Create workspace
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
