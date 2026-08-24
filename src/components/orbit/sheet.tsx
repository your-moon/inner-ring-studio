"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";

/**
 * A side panel that slides in from an edge — for detail, filters, or settings
 * that shouldn't take over the screen the way a Dialog does. Modal by default.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type Side = "right" | "left" | "top" | "bottom";

const SIDE: Record<Side, string> = {
  right:
    "inset-y-0 right-0 h-full w-[380px] max-w-[92vw] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  left:
    "inset-y-0 left-0 h-full w-[380px] max-w-[92vw] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  top:
    "inset-x-0 top-0 h-auto max-h-[92vh] border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
  bottom:
    "inset-x-0 bottom-0 h-auto max-h-[92vh] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
};

export type SheetContentProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  side?: Side;
  title?: ReactNode;
  description?: ReactNode;
};

export const SheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(function SheetContent(
  { side = "right", title, description, className, children, ...props },
  ref
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "bg-surface-panel fixed z-50 flex flex-col gap-4 p-5 shadow-[var(--shadow-modal)] border-border-default",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          SIDE[side],
          className
        )}
        {...props}
      >
        {title || description ? (
          <div className="flex flex-col gap-1">
            {title ? (
              <DialogPrimitive.Title className="text-heading-small [color:var(--content-primary)] font-semibold tracking-[var(--tracking-heading)]">
                {title}
              </DialogPrimitive.Title>
            ) : null}
            {description ? (
              <DialogPrimitive.Description className="text-ui-small [color:var(--content-tertiary)]">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
        ) : null}
        {children}
        <DialogPrimitive.Close asChild>
          <IconButton aria-label="Close" size="sm" className="absolute top-3.5 right-3.5">
            <X />
          </IconButton>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
