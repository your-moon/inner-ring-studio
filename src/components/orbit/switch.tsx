"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value"
> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * A binary on/off switch (role="switch"). Use it for a setting that takes
 * effect immediately; use Checkbox inside a form that is submitted.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    { className, checked = false, onCheckedChange, disabled, ...props },
    ref
  ) {
    const field = useFieldControl();
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "focus-ring press inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-transparent p-0.5",
          checked ? "bg-primary" : "bg-surface-hover",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...field}
        {...props}
      >
        <span
          className={cn(
            "size-3.5 rounded-full bg-white shadow-[var(--shadow-raised)] transition-transform",
            checked ? "translate-x-3" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);
