import { DatabaseResultStat } from "@/drivers/base-driver";

/**
 * The quiet status line under a result grid: "50 rows · 231 ms". Latency is a
 * feature — always show it. Write counters appear only when a write happened,
 * so a plain SELECT never says "affected".
 */
export default function ResultStats({
  stats,
  rowCount,
}: {
  stats: DatabaseResultStat;
  rowCount?: number;
}) {
  const parts: string[] = [];

  if (rowCount !== undefined) {
    parts.push(`${rowCount.toLocaleString()} ${rowCount === 1 ? "row" : "rows"}`);
  }
  if (stats.queryDurationMs !== null && stats.queryDurationMs !== undefined) {
    parts.push(`${Math.round(stats.queryDurationMs)} ms`);
  }
  // Some drivers report a SELECT's row count as rowsAffected — "50 rows · 50
  // affected" is noise. Only show it when it says something the count doesn't.
  if (stats.rowsAffected && stats.rowsAffected !== rowCount) {
    parts.push(`${stats.rowsAffected.toLocaleString()} affected`);
  }
  if (stats.rowsRead && rowCount === undefined) {
    parts.push(`${stats.rowsRead.toLocaleString()} read`);
  }
  if (stats.rowsWritten) {
    parts.push(`${stats.rowsWritten.toLocaleString()} written`);
  }

  if (parts.length === 0) return null;

  return (
    <div className="px-2 text-xs text-muted-foreground tabular-nums">
      {parts.join(" · ")}
    </div>
  );
}
