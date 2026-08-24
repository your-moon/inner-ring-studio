import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A Linear-style category label: a small colored dot carries the color, the
 * text stays in the neutral ink ramp. Decorative color from a fixed palette —
 * meaning-bearing chroma belongs to Badge/EnvBadge/StatusDot instead.
 */
export const LABEL_COLORS = {
  gray: "#8a8f98",
  red: "#eb5757",
  orange: "#f2994a",
  amber: "#f2c94c",
  green: "#4cb782",
  teal: "#4cb7b7",
  blue: "#4ea7fc",
  indigo: "#5e6ad2",
  purple: "#a855f7",
  pink: "#e879c7",
} as const;

export type LabelColor = keyof typeof LABEL_COLORS;

export type LabelProps = {
  children: ReactNode;
  color?: LabelColor;
  className?: string;
};

export function Label({ children, color = "gray", className }: LabelProps) {
  return (
    <span
      className={cn(
        "border-border-default inline-flex h-5 shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] border pr-2 pl-1.5",
        "text-ui-small [color:var(--content-secondary)] font-[var(--weight-medium)] whitespace-nowrap",
        className
      )}
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: LABEL_COLORS[color] }}
      />
      {children}
    </span>
  );
}
