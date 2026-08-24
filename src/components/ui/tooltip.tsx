"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
}

const TooltipProvider =
  TooltipPrimitive.Provider as React.FC<TooltipProviderProps>;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-[var(--radius-control)] border border-border-default bg-surface-overlay px-2 py-1 text-ui-small [color:var(--content-primary)] shadow-[var(--shadow-menu)] origin-[var(--radix-tooltip-content-transform-origin)] data-[state=delayed-open]:animate-[orbit-pop-in_var(--motion-fast)_var(--ease-out)_both] data-[state=instant-open]:animate-[orbit-pop-in_var(--motion-fast)_var(--ease-out)_both] data-[state=closed]:animate-[orbit-pop-out_var(--motion-fast)_var(--ease-out)_both] motion-reduce:animate-none",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
