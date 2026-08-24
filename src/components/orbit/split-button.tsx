"use client";

import { CaretDown } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { Button, type ButtonProps } from "./button";

export type SplitButtonProps = Omit<ButtonProps, "shape"> & {
  menu: ReactNode;
  menuLabel?: string;
};

/** Primary action plus a separately focusable menu of related actions. */
export function SplitButton({
  children,
  className,
  disabled,
  loading,
  menu,
  menuLabel = "More actions",
  size = "base",
  title,
  variant = "primary",
  ...props
}: SplitButtonProps) {
  return (
    <div className="inline-flex" role="group" aria-label={menuLabel}>
      <Button
        {...props}
        className={cn("rounded-r-none", className)}
        disabled={disabled}
        loading={loading}
        size={size}
        title={title}
        variant={variant}
      >
        {children}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={menuLabel}
            className="-ml-px rounded-l-none px-0"
            disabled={disabled || loading}
            shape="square"
            size={size}
            variant={variant}
          >
            <CaretDown weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-border-default bg-surface-overlay min-w-44 rounded-[var(--radius-menu)] shadow-[var(--shadow-menu)]"
        >
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
