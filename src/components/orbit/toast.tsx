"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

/**
 * Toasts over sonner, skinned to the Orbit surface/overlay tokens. Mount one
 * <Toaster /> near the app root; raise messages with `toast(...)`.
 *
 *   toast.success("Saved");  toast.error("Couldn't connect");
 */
export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!bg-[var(--surface-overlay)] !border-border-default !text-[color:var(--content-primary)] !rounded-[var(--radius-menu)] !shadow-[var(--shadow-menu)]",
          title: "!text-ui-default !font-[var(--weight-medium)]",
          description: "!text-ui-small !text-[color:var(--content-tertiary)]",
          actionButton:
            "!bg-primary !text-[color:var(--primary-foreground)] !rounded-[var(--radius-control)]",
          cancelButton:
            "!bg-surface-overlay !text-[color:var(--content-secondary)] !rounded-[var(--radius-control)]",
          icon: "!size-[var(--icon-sm)]",
        },
      }}
      {...props}
    />
  );
}

export { toast };
