import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * The app-shell button, rendered on the crisp design system's generated
 * action-button recipe (@seed-design/css — Attio-measured: white + ring-shadow
 * secondary, brand solid primary, quiet color-only transitions, no press
 * motion). This file only maps the shadcn-style API onto the generated classes.
 */
const buttonVariants = cva(
  "seed-action-button inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap select-none disabled:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "seed-action-button--variant_brandSolid",
        destructive: "seed-action-button--variant_criticalSolid",
        outline: "seed-action-button--variant_neutralOutline",
        secondary: "seed-action-button--variant_neutralOutline",
        ghost:
          "seed-action-button--variant_ghost [color:var(--content-secondary)] hover:[color:var(--content-primary)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "seed-action-button--size_medium seed-action-button--layout_withText seed-action-button--size_medium-layout_withText",
        sm: "seed-action-button--size_small seed-action-button--layout_withText seed-action-button--size_small-layout_withText",
        lg: "seed-action-button--size_large seed-action-button--layout_withText seed-action-button--size_large-layout_withText",
        icon: "seed-action-button--size_medium seed-action-button--layout_iconOnly seed-action-button--size_medium-layout_iconOnly",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
