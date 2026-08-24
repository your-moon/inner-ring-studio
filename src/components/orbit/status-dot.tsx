import { cn } from "@/lib/utils";

export type ConnectionStatus = "live" | "idle" | "error";

const STATUS_META: Record<
  ConnectionStatus,
  { title: string; color: string }
> = {
  live: { title: "Connected", color: "var(--intent-success)" },
  idle: { title: "Idle", color: "var(--border-strong)" },
  error: { title: "Can't connect", color: "var(--intent-danger)" },
};

/**
 * The connection status dot: color is the meaning (green = live pool,
 * grey = idle, red = last connect failed), the tooltip is the words. Because
 * color alone isn't accessible, always pair it with a text label in context.
 */
export default function StatusDot({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const { title, color } = STATUS_META[status];
  return (
    <span
      title={title}
      role="img"
      aria-label={title}
      className={cn("inline-block size-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
