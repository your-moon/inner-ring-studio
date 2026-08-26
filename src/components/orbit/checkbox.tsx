"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
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
        // Attio-measured (crisp tokens): 16px box, 6px radius, hairline border,
        // brand fill when set. No press/scale motion.
        "focus-ring grid size-4 shrink-0 place-items-center rounded-[6px] border",
        "border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] [color:var(--content-primary)]",
        "hover:border-[var(--seed-color-stroke-neutral)]",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--seed-color-bg-brand-solid)] data-[state=checked]:[color:var(--seed-color-palette-static-white,#fff)]",
        "data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-[var(--seed-color-bg-brand-solid)] data-[state=indeterminate]:[color:var(--seed-color-palette-static-white,#fff)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...field}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center [&_svg]:size-3">
        {checked === "indeterminate" ? (
          <Minus />
        ) : (
          <Check />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
