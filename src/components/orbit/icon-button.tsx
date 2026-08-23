"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls must still say what they do. */
  "aria-label": string;
  size?: "sm" | "base";
  /** Pressed/active state (panel toggles, filters). */
  toggled?: boolean;
}

/**
 * The quiet square icon button used across the shell (sidebar panel icons,
 * tree filter, header chrome): ghost at rest, secondary fill on hover or
 * while toggled. Pair with <Tooltip> for the visible name.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ className, size = "base", toggled, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "u-smooth press grid shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-6 w-6 [&_svg]:h-[13px] [&_svg]:w-[13px]" : "h-7 w-7 [&_svg]:h-[15px] [&_svg]:w-[15px]",
          toggled && "bg-secondary text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);

export default IconButton;
