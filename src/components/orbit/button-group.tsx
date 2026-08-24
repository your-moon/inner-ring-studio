"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
} from "react";

import { cn } from "@/lib/utils";

export type ButtonGroupProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement>
>;

export function ButtonGroup({
  children,
  className,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "border-border-default bg-surface-canvas inline-flex h-8 items-center gap-0.5 rounded-[var(--radius-control)] border p-0.5",
        className,
      )}
      {...props}
    >
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
      className={cn(
        "focus-ring press text-ui-small inline-flex h-6 items-center justify-center gap-1.5 rounded-[6px] px-2 font-[var(--weight-medium)] [line-height:var(--type-ui-small-line-height)]",
        "[color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
        "disabled:pointer-events-none disabled:opacity-50",
        selected &&
          "bg-surface-raised [color:var(--content-primary)] shadow-[var(--shadow-hairline),var(--shadow-raised)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
