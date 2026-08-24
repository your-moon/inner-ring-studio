import { cn } from "@/lib/utils";

/**
 * Workflow-state glyph, modelled on Linear: the *shape* carries the state so
 * it reads in greyscale, and color only reinforces it. Pair with a text label.
 */
export type WorkflowStatus =
  | "backlog"
  | "todo"
  | "started"
  | "done"
  | "cancelled";

const STATUS_META: Record<
  WorkflowStatus,
  { label: string; color: string }
> = {
  backlog: { label: "Backlog", color: "var(--content-tertiary)" },
  todo: { label: "Todo", color: "var(--content-tertiary)" },
  started: { label: "In Progress", color: "#f2c94c" },
  done: { label: "Done", color: "var(--intent-accent)" },
  cancelled: { label: "Cancelled", color: "var(--content-tertiary)" },
};

export type StatusIconProps = {
  status: WorkflowStatus;
  className?: string;
};

export function StatusIcon({ status, className }: StatusIconProps) {
  const { label, color } = STATUS_META[status];
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
      style={{ color }}
    >
      {status === "backlog" && (
        <circle
          cx="7"
          cy="7"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="1.6 1.8"
        />
      )}
      {status === "todo" && (
        <circle
          cx="7"
          cy="7"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
      {status === "started" && (
        <>
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M7 7 L7 2.5 A4.5 4.5 0 0 1 11.5 7 Z" fill="currentColor" />
        </>
      )}
      {status === "done" && (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d="M4.3 7.1 L6.2 9 L9.7 5"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {status === "cancelled" && (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path
            d="M4.8 4.8 L9.2 9.2 M9.2 4.8 L4.8 9.2"
            stroke="var(--surface-canvas)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
