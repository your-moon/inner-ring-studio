"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export type SliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Show the current value beside the track. */
  showValue?: boolean;
  formatValue?: (value: number) => string;
};

/**
 * A single-value slider over the native range input — accent-colored track and
 * thumb, keyboard-operable for free, and Field-wired. For a precise number use
 * NumberField instead.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    className,
    value,
    defaultValue,
    onValueChange,
    showValue = false,
    formatValue,
    min = 0,
    max = 100,
    ...props
  },
  ref
) {
  const field = useFieldControl();
  const current = value ?? defaultValue ?? 0;
  const display = formatValue ? formatValue(current) : String(current);
  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        className={cn(
          "focus-ring h-1.5 w-full cursor-pointer appearance-none rounded-[var(--radius-full)]",
          "bg-surface-selected accent-[var(--primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...field}
        {...props}
      />
      {showValue ? (
        <span className="text-ui-small [color:var(--content-secondary)] w-10 shrink-0 text-right [font-variant-numeric:tabular-nums]">
          {display}
        </span>
      ) : null}
    </div>
  );
});
