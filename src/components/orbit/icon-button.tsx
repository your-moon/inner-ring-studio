"use client";

import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/*
 * Visuals come from the crisp action-button recipe (iconOnly layout); this maps
 * the Orbit IconButton API onto the generated classes. `destructive` stays a
 * local ghost-red (crisp has no ghost-critical variant yet).
 */
const ICON_BUTTON_VARIANTS = {
  ghost:
    "seed-action-button--variant_ghost [color:var(--content-tertiary)] hover:[color:var(--content-primary)]",
  secondary: "seed-action-button--variant_neutralOutline",
  primary: "seed-action-button--variant_brandSolid",
  destructive:
    "bg-transparent [color:var(--intent-danger)] hover:bg-[var(--intent-danger-soft)]",
} as const;

// Orbit sm/base/lg → crisp xsmall(24)/small(28)/medium(32), iconOnly squares.
const ICON_BUTTON_SIZES = {
  sm: "seed-action-button--size_xsmall seed-action-button--layout_iconOnly seed-action-button--size_xsmall-layout_iconOnly [&_svg]:size-[var(--icon-xs)]",
  base: "seed-action-button--size_small seed-action-button--layout_iconOnly seed-action-button--size_small-layout_iconOnly [&_svg]:size-[var(--icon-sm)]",
  lg: "seed-action-button--size_medium seed-action-button--layout_iconOnly seed-action-button--size_medium-layout_iconOnly [&_svg]:size-[var(--icon-md)]",
} as const;

const ICON_BUTTON_TOGGLED_VARIANTS = {
  ghost:
    "border-border-subtle bg-surface-selected [color:var(--content-primary)]",
  secondary:
    "border-border-strong bg-surface-selected [color:var(--content-primary)]",
  primary: "border-[var(--primary-hover)] bg-[var(--primary-hover)]",
  destructive:
    "border-intent-danger/30 bg-[var(--intent-danger-soft)] [color:var(--intent-danger)]",
} as const;

export type IconButtonVariant = keyof typeof ICON_BUTTON_VARIANTS;
export type IconButtonSize = keyof typeof ICON_BUTTON_SIZES;

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls must still say what they do. */
  "aria-label": string;
  asChild?: boolean;
  size?: IconButtonSize;
  /** Pressed/active state for panel toggles and filters. */
  toggled?: boolean;
  variant?: IconButtonVariant;
}

/** Quiet icon-only action. Pair with Tooltip for a visible label. */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      asChild = false,
      className,
      size = "base",
      toggled,
      type,
      variant = "ghost",
      ...props
    },
    ref,
  ) {
    const Component = asChild ? Slot : "button";

    return (
      <Component
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        aria-pressed={toggled}
        data-state={toggled ? "on" : "off"}
        className={cn(
          "seed-action-button inline-grid shrink-0 place-items-center disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
          ICON_BUTTON_VARIANTS[variant],
          ICON_BUTTON_SIZES[size],
          toggled && ICON_BUTTON_TOGGLED_VARIANTS[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
