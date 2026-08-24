import { cn } from "@/lib/utils";

/**
 * A quiet metadata chip (dialect, count, category): hairline border, muted
 * ink, no fill. Chroma stays reserved for meaning (see Badge, EnvBadge,
 * StatusDot); decorative category color belongs to Label.
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
        "border-border-default [color:var(--content-tertiary)] inline-flex h-[18px] shrink-0 items-center rounded-[var(--radius-small)] border px-1.5",
        "text-ui-caption [line-height:1] font-[var(--weight-medium)] whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}
