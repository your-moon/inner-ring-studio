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
        "border-border-subtle bg-surface-panel inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--radius-small)] border px-1 font-sans text-[11px] font-medium [color:var(--content-tertiary)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
