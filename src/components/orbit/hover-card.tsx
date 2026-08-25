"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A rich hover preview (a connection, a user, a table). Unlike Tooltip it can
 * hold structured content and is not announced as a label — hover/focus intent
 * with a short delay.
 */
export const HoverCard = HoverCardPrimitive.Root;
export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export const HoverCardContent = forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(function HoverCardContent(
  { className, align = "center", sideOffset = 6, ...props },
  ref
) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "border-border-default bg-surface-overlay z-50 w-64 rounded-[var(--radius-menu)] border p-3 [color:var(--content-primary)] shadow-[var(--shadow-menu)] outline-none",
          "origin-[var(--radix-hover-card-content-transform-origin)] data-[state=open]:animate-[orbit-pop-in_var(--motion-fast)_var(--ease-out)_both] data-[state=closed]:animate-[orbit-pop-out_var(--motion-fast)_var(--ease-out)_both] motion-reduce:animate-none",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
});
