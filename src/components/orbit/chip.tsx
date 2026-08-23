import { cn } from "@/lib/utils";

/**
 * A quiet metadata chip (dialect, count, category): hairline border, muted
 * ink, no fill. Chroma stays reserved for meaning (see EnvBadge, StatusDot).
 */
export default function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-[5px] border border-border px-1.5 py-px text-[11px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
