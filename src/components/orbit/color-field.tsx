"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export type ColorFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/** A color swatch over the native color input, paired with its hex value. */
export const ColorField = forwardRef<HTMLInputElement, ColorFieldProps>(
  function ColorField({ value, onValueChange, disabled, className }, ref) {
    const field = useFieldControl();
    return (
      <div
        className={cn(
          "focus-within:border-border-focus border-border-default bg-surface-canvas inline-flex h-8 items-center gap-2 rounded-[var(--radius-control)] border pr-2.5 pl-1",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(e.target.value)}
          className="focus-ring size-6 cursor-pointer rounded-[var(--radius-small)] border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-[4px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
          {...field}
        />
        <span className="text-ui-small [color:var(--content-secondary)] font-mono uppercase">
          {value}
        </span>
      </div>
    );
  }
);
