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
        "shrink-0 rounded px-[5px] py-px text-[9.5px] font-semibold tracking-[0.04em] uppercase",
        prod
          ? "border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400"
          : "border border-border text-muted-foreground",
        className
      )}
    >
      {prod ? "prod" : "staging"}
    </span>
  );
}
