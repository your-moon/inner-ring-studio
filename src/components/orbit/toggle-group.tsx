"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import { GROUP_FRAME_CLASS, groupItemClass } from "./button-group";

export type ToggleGroupProps = ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Root
>;

/**
 * Independent on/off options that share one frame — display density,
 * column visibility, formatting. Use ButtonGroup instead when exactly one
 * option is selected at a time, and Button `toggled` for a lone switch.
 *
 * The set carries toolbar semantics with roving arrow-key focus (one tab
 * stop for the whole group); each item reports its own aria-pressed.
 */
export function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(GROUP_FRAME_CLASS, className)}
      {...props}
    />
  );
}

export type ToggleGroupItemProps = ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Item
>;

export function ToggleGroupItem({ className, ...props }: ToggleGroupItemProps) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        groupItemClass(false, className),
        "data-[state=on]:bg-surface-raised data-[state=on]:shadow-[var(--shadow-hairline),var(--shadow-raised)] data-[state=on]:[color:var(--content-primary)]"
      )}
      {...props}
    />
  );
}
