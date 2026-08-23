import { cn } from "@/lib/utils";

/**
 * The one empty-state shape: a single quiet line (optionally two), centered,
 * never a card and never an illustration. Keyboard hints go through <Kbd>
 * inside `children`.
 */
export default function EmptyState({
  children,
  secondary,
  className,
}: {
  children: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1.5 px-6 text-center",
        className
      )}
    >
      <p className="text-[13px] text-muted-foreground">{children}</p>
      {secondary && (
        <p className="text-[12px] text-muted-foreground/70">{secondary}</p>
      )}
    </div>
  );
}
