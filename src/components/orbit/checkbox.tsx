"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "@phosphor-icons/react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

export type CheckboxProps = ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
>;

/** A tokenized checkbox with checked and indeterminate states. */
export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox({ className, checked, ...props }, ref) {
  const field = useFieldControl();
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        "focus-ring press grid size-4 shrink-0 place-items-center rounded-[var(--radius-small)] border",
        "border-border-strong bg-surface-canvas [color:var(--content-primary)]",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:[color:var(--primary-foreground)]",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:[color:var(--primary-foreground)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...field}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center [&_svg]:size-3">
        {checked === "indeterminate" ? (
          <Minus weight="bold" />
        ) : (
          <Check weight="bold" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
