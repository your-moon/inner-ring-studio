"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * The settings left-nav caption. Ground-truthed on linear.app/settings:
 * 13px, weight 500, tertiary colour, sentence case (not uppercase).
 */

/** A non-collapsing section caption above a group of settings nav rows. */
export function SettingsGroupHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-ui-small flex h-7 items-center px-2 font-[var(--weight-medium)] [color:var(--content-tertiary)]",
        className
      )}
    >
      {children}
    </div>
  );
}
