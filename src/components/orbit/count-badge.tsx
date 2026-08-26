import { cn } from "@/lib/utils";

/**
 * A tiny neutral counter (unread, results, matches). Tabular digits keep the
 * width steady as the number changes; caps at max+ for large counts.
 */
export type CountBadgeProps = {
  count: number;
  max?: number;
  className?: string;
};

export function CountBadge({ count, max = 99, className }: CountBadgeProps) {
  const display = count > max ? `${max}+` : String(count);
  return (
    <span
      className={cn(
        "bg-surface-hover [color:var(--content-secondary)] inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[var(--radius-full)] px-1",
        "text-ui-caption [line-height:1] font-[var(--weight-medium)] [font-variant-numeric:tabular-nums]",
        className
      )}
    >
      {display}
    </span>
  );
}
