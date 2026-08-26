"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronsUpDown } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";

const TRIGGER_SIZES = {
  sm: "h-7 text-ui-small [line-height:var(--type-ui-small-line-height)]",
  base: "h-8 text-ui-default [line-height:var(--type-ui-default-line-height)]",
  lg: "h-9 text-ui-default [line-height:var(--type-ui-default-line-height)]",
} as const;

export type SelectSize = keyof typeof TRIGGER_SIZES;

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export type SelectTriggerProps = ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> & {
  size?: SelectSize;
  invalid?: boolean;
};

/** The token-styled trigger. Placeholder and value come from SelectValue. */
export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(function SelectTrigger(
  { className, children, size = "base", invalid = false, ...props },
  ref
) {
  const field = useFieldControl();
  const merged = { ...field, ...props };
  const isInvalid = invalid || merged["aria-invalid"] === true;
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "focus-ring press flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border bg-surface-canvas px-2.5",
        "[color:var(--content-primary)] data-[placeholder]:[color:var(--content-tertiary)]",
        "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        isInvalid
          ? "border-intent-danger"
          : "border-border-default focus:border-border-focus",
        TRIGGER_SIZES[size],
        className
      )}
      {...merged}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronsUpDown className="size-[var(--icon-sm)] shrink-0 [color:var(--content-tertiary)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

export type SelectContentProps = ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
>;

export const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(function SelectContent(
  { className, children, position = "popper", ...props },
  ref
) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        className={cn(
          "border-border-default bg-surface-overlay z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-hidden rounded-[var(--radius-menu)] border p-1 shadow-[var(--shadow-menu)]",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1 w-[--radix-select-trigger-width]",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

export type SelectItemProps = ComponentPropsWithoutRef<
  typeof SelectPrimitive.Item
> & { children: ReactNode };

export const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "text-ui-default relative flex h-7 w-full cursor-default items-center rounded-[6px] pr-2 pl-7 outline-none select-none",
        "[color:var(--content-secondary)] data-[highlighted]:bg-surface-hover data-[highlighted]:[color:var(--content-primary)]",
        "data-[state=checked]:[color:var(--content-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});

export function SelectSeparator({ className }: { className?: string }) {
  return (
    <SelectPrimitive.Separator
      className={cn("bg-border-subtle -mx-1 my-1 h-px", className)}
    />
  );
}

export function SelectLabel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "text-ui-caption [color:var(--content-tertiary)] px-7 py-1.5",
        className
      )}
    >
      {children}
    </SelectPrimitive.Label>
  );
}
