import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A semantic status badge. Intent is the meaning; a badge stays quiet (soft
 * tinted fill, no border) so several can sit in a row without shouting.
 * For decorative category tags use Label; for neutral metadata use Chip.
 */
const BADGE_INTENTS = {
  neutral:
    "bg-surface-selected [color:var(--content-secondary)]",
  accent:
    "bg-[var(--intent-accent-soft)] [color:var(--intent-accent)]",
  success:
    "bg-[var(--intent-success-soft)] [color:var(--intent-success)]",
  warning:
    "bg-[var(--intent-warning-soft)] [color:var(--intent-warning)]",
  danger:
    "bg-[var(--intent-danger-soft)] [color:var(--intent-danger)]",
  info: "bg-[var(--intent-info-soft)] [color:var(--intent-info)]",
} as const;

const BADGE_SIZES = {
  sm: "h-[18px] px-1.5 text-ui-caption [line-height:var(--type-ui-caption-line-height)]",
  base: "h-5 px-2 text-ui-small [line-height:var(--type-ui-small-line-height)]",
} as const;

export type BadgeIntent = keyof typeof BADGE_INTENTS;
export type BadgeSize = keyof typeof BADGE_SIZES;

export type BadgeProps = {
  children: ReactNode;
  intent?: BadgeIntent;
  size?: BadgeSize;
  className?: string;
};

export function Badge({
  children,
  intent = "neutral",
  size = "base",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-full)] font-[var(--weight-medium)] whitespace-nowrap",
        BADGE_INTENTS[intent],
        BADGE_SIZES[size],
        className
      )}
    >
      {children}
    </span>
  );
}
