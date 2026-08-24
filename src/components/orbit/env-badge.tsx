import { cn } from "@/lib/utils";

/**
 * Environment badge for a connection. Production is the loud one — amber, so a
 * prod target is unmistakable everywhere it appears (home rows, sidebar tree,
 * studio header, write-confirm dialog). Staging stays neutral; unmarked
 * connections render nothing.
 */
export default function EnvBadge({
  environment,
  className,
}: {
  environment?: string;
  className?: string;
}) {
  if (environment !== "production" && environment !== "staging") return null;
  const prod = environment === "production";
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center rounded-[var(--radius-small)] px-1.5",
        "text-ui-micro [line-height:1] font-[var(--weight-semibold)] tracking-[0.05em] uppercase",
        prod
          ? "bg-[var(--intent-warning-soft)] [color:var(--intent-warning)]"
          : "border-border-default [color:var(--content-tertiary)] border",
        className
      )}
    >
      {prod ? "prod" : "staging"}
    </span>
  );
}
