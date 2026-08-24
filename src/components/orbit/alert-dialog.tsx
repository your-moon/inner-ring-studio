"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/**
 * A blocking confirm for consequential, hard-to-undo actions (dropping a
 * table, deleting a connection, a production write). Unlike Dialog it traps
 * focus on the choice and has no dismiss affordance but the two buttons.
 */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export type AlertDialogProps = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  children?: ReactNode;
};

export const AlertDialogContent = forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogProps &
    Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>, "title">
>(function AlertDialogContent(
  {
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = true,
    onConfirm,
    children,
    className,
    ...props
  },
  ref
) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[orbit-overlay-in_var(--motion-base)_var(--ease-out)] data-[state=closed]:animate-[orbit-overlay-out_var(--motion-fast)_var(--ease-out)] motion-reduce:animate-none" />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "bg-surface-panel fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-modal)] border border-border-default p-6 shadow-[var(--shadow-modal)]",
          "data-[state=open]:animate-[orbit-dialog-in_var(--motion-base)_var(--ease-out)] data-[state=closed]:animate-[orbit-dialog-out_var(--motion-fast)_var(--ease-out)] motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        <div className="flex flex-col gap-1.5">
          <AlertDialogPrimitive.Title className="text-heading-small [color:var(--content-primary)] font-semibold tracking-[var(--tracking-heading)]">
            {title}
          </AlertDialogPrimitive.Title>
          {description ? (
            <AlertDialogPrimitive.Description className="text-ui-small [color:var(--content-secondary)]">
              {description}
            </AlertDialogPrimitive.Description>
          ) : null}
        </div>
        {children}
        <div className="flex justify-end gap-2">
          <AlertDialogPrimitive.Cancel asChild>
            <Button variant="secondary" title={cancelLabel} />
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action asChild>
            <Button
              variant={destructive ? "destructive" : "primary"}
              title={confirmLabel}
              onClick={onConfirm}
            />
          </AlertDialogPrimitive.Action>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
});
