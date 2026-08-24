"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
} from "react";

import { cn } from "@/lib/utils";

/** The frame that holds a set of mutually related controls. */
export const GROUP_FRAME_CLASS =
  "border-border-default bg-surface-canvas inline-flex h-8 items-center gap-0.5 rounded-[var(--radius-control)] border p-0.5";

/**
 * The item inside a group frame. Shared by ButtonGroupItem (one selected
 * view) and ToggleGroupItem (independent on/off formatting) so grouped
 * controls never drift apart visually.
 */
export function groupItemClass(selected: boolean, className?: string) {
  return cn(
    "focus-ring press text-ui-small inline-flex h-6 items-center justify-center gap-1.5 rounded-[6px] px-2 [line-height:var(--type-ui-small-line-height)] font-[var(--weight-medium)]",
    "hover:bg-surface-hover [color:var(--content-tertiary)] hover:[color:var(--content-primary)]",
    "disabled:pointer-events-none disabled:opacity-50",
    selected &&
      "bg-surface-raised [color:var(--content-primary)] shadow-[var(--shadow-hairline),var(--shadow-raised)]",
    className
  );
}

export type ButtonGroupProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement>
>;

export function ButtonGroup({
  children,
  className,
  ...props
}: ButtonGroupProps) {
  return (
    <div role="group" className={cn(GROUP_FRAME_CLASS, className)} {...props}>
      {children}
    </div>
  );
}

export interface ButtonGroupItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function ButtonGroupItem({
  children,
  className,
  selected = false,
  type = "button",
  ...props
}: ButtonGroupItemProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      data-state={selected ? "on" : "off"}
      className={groupItemClass(selected, className)}
      {...props}
    >
      {children}
    </button>
  );
}
