import { cn } from "@/lib/utils";

/**
 * Priority glyph, modelled on Linear's ascending bars. Urgent is the loud one
 * (filled amber square); the rest read by how many bars are lit.
 */
export type Priority = "none" | "low" | "medium" | "high" | "urgent";

const PRIORITY_LABEL: Record<Priority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const LIT: Record<Priority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 0,
};

export type PriorityIconProps = {
  priority: Priority;
  className?: string;
};

export function PriorityIcon({ priority, className }: PriorityIconProps) {
  const label = PRIORITY_LABEL[priority];

  if (priority === "urgent") {
    return (
      <svg
        viewBox="0 0 14 14"
        width="14"
        height="14"
        role="img"
        aria-label={label}
        className={cn("shrink-0", className)}
        style={{ color: "#f2994a" }}
      >
        <rect x="1" y="1" width="12" height="12" rx="3" fill="currentColor" />
        <rect x="6.25" y="3.2" width="1.5" height="4.6" rx="0.75" fill="#fff" />
        <rect x="6.25" y="9.2" width="1.5" height="1.6" rx="0.75" fill="#fff" />
      </svg>
    );
  }

  const bars = [
    { x: 1.5, h: 4, y: 9 },
    { x: 5.75, h: 7, y: 6 },
    { x: 10, h: 10, y: 3 },
  ];
  const lit = LIT[priority];

  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      {bars.map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={b.y}
          width="2.5"
          height={b.h}
          rx="1"
          fill={i < lit ? "var(--content-primary)" : "var(--border-strong)"}
        />
      ))}
    </svg>
  );
}
