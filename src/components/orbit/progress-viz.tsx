import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- ProgressDonut */

/** Linear's sub-issue progress ring: a small donut filled by value/total. */
export function ProgressDonut({
  value,
  total,
  size = 14,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const r = size / 2 - 1.5;
  const circ = 2 * Math.PI * r;
  const complete = pct >= 1;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${value} of ${total}`}
      className={cn("shrink-0 -rotate-90", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="2"
        stroke="var(--border-strong)"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        stroke={complete ? "var(--intent-success)" : "var(--intent-accent)"}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
      />
    </svg>
  );
}

/* ------------------------------------------------------------ SegmentedProgress */

export type ProgressSegment = { value: number; color: string; label?: string };

/** Linear's cycle/project progress: a single track split into colored
 * segments (done / started / scope). */
export function SegmentedProgress({
  segments,
  total,
  className,
}: {
  segments: ProgressSegment[];
  total: number;
  className?: string;
}) {
  const sum = segments.reduce((a, s) => a + s.value, 0);
  const scope = Math.max(total, sum);
  return (
    <div
      className={cn(
        "bg-surface-selected flex h-1.5 w-full overflow-hidden rounded-[var(--radius-full)]",
        className
      )}
      role="progressbar"
      aria-valuenow={sum}
      aria-valuemin={0}
      aria-valuemax={scope}
    >
      {segments.map((s, i) => (
        <span
          key={i}
          title={s.label}
          style={{
            width: `${(s.value / scope) * 100}%`,
            backgroundColor: s.color,
          }}
        />
      ))}
    </div>
  );
}
