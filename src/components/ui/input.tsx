"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/*
 * The app-shell text input, rendered on the crisp design system's generated
 * text-input recipe (src/styles/crisp/text-input.css — Attio-measured: 32px,
 * 8px radius, 1px hairline at rest, 2px neutral-contrast ring on focus).
 * The recipe's chrome lives on the root wrapper (::after keyed by data-focus /
 * data-invalid); the ref still points at the real <input>.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    return (
      <div
        className={cn(
          "seed-text-input__root seed-text-input__root--variant_outline seed-text-input__root--variant_outline-size_medium",
          "w-full cursor-text has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
          className
        )}
        data-focus={focused || undefined}
        data-disabled={props.disabled || undefined}
      >
        <input
          type={type}
          className={cn(
            "seed-text-input__value seed-text-input__value--size_medium seed-text-input__value--variant_outline-size_medium",
            "w-full min-w-0 bg-transparent outline-none placeholder:[color:var(--content-tertiary)]",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium"
          )}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
