import { cn } from "@/lib/utils";

/**
 * The one way keyboard hints are rendered (Linear ships a dedicated KBD
 * component for the same reason): every hint looks identical and, when given a
 * KeyMatcher, is platform-correct (⌘ on Mac, Ctrl elsewhere) instead of a
 * hardcoded Mac keycap.
 */
export default function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "rounded border border-border bg-secondary/50 px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}
