import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import type { Density as DensityName } from "./foundations";

type DensityProps = ComponentPropsWithoutRef<"div"> & {
  density?: DensityName;
  asChild?: boolean;
};

/**
 * Scopes component density without changing theme or global document state.
 * This lets a compact data grid sit beside comfortable settings content.
 */
export function Density({
  density = "default",
  asChild = false,
  className,
  ...props
}: DensityProps) {
  const Component = asChild ? Slot : "div";

  return (
    <Component
      data-density={density}
      className={cn("[--density:var(--density-scale)]", className)}
      {...props}
    />
  );
}

export type { DensityProps };
