"use client";

import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const ICON_BUTTON_VARIANTS = {
  ghost:
    "border-transparent bg-transparent [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
  secondary:
    "border-border-default bg-surface-raised [color:var(--content-secondary)] shadow-[var(--shadow-raised)] hover:border-border-strong hover:bg-surface-hover hover:[color:var(--content-primary)]",
  primary:
    "border-primary bg-primary [color:var(--primary-foreground)] shadow-[var(--shadow-raised)] hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)]",
  destructive:
    "border-transparent bg-transparent [color:var(--intent-danger)] hover:bg-[var(--intent-danger-soft)]",
} as const;

const ICON_BUTTON_SIZES = {
  sm: "size-6 [&_svg]:size-[var(--icon-xs)]",
  base: "size-7 [&_svg]:size-[var(--icon-sm)]",
  lg: "size-8 [&_svg]:size-[var(--icon-md)]",
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
          "focus-ring press inline-grid shrink-0 place-items-center rounded-[var(--radius-control)] border disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
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
