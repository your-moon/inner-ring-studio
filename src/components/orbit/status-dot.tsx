import { cn } from "@/lib/utils";

export type ConnectionStatus = "live" | "idle" | "error";

/**
 * The connection status dot: color is the meaning (green = live pool,
 * gray = idle, red = last connect failed), the tooltip is the words.
 */
export default function StatusDot({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  return (
    <span
      title={
        status === "live"
          ? "Connected"
          : status === "error"
            ? "Can't connect"
            : "Idle"
      }
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        status === "live" && "bg-emerald-500",
        status === "idle" && "bg-border",
        status === "error" && "bg-red-500",
        className
      )}
    />
  );
}
