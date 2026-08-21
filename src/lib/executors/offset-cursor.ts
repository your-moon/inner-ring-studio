// Stateless LIMIT/OFFSET pagination shared by the MySQL and ClickHouse
// executors: neither has a server-side cursor, so the offset is carried in an
// opaque base64url token. Correct for a query with a stable ORDER BY; for an
// unordered browse the order may shift between pages — acceptable for read-only
// browsing, and far better than loading a whole table.
//
// (Historically these lived in the query route named `encodeChCursor`, but the
// MySQL branch shared them too — the format was never ClickHouse-specific.)

/** Trimmed SQL if it can be offset-paged, or null for statements we must run
 *  verbatim (SHOW/DESCRIBE, an explicit LIMIT/OFFSET, or a FORMAT clause). */
export function pageableSelect(sql: string): string | null {
  const t = sql.trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(t)) return null;
  if (/\b(limit|offset)\b/i.test(t)) return null;
  if (/\bformat\b/i.test(t)) return null;
  return t;
}

export function encodeOffsetCursor(sql: string, offset: number): string {
  return Buffer.from(JSON.stringify({ sql, offset })).toString("base64url");
}

export function decodeOffsetCursor(
  token: string
): { sql: string; offset: number } | null {
  try {
    const o = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (typeof o.sql === "string" && typeof o.offset === "number") return o;
  } catch {
    /* malformed token */
  }
  return null;
}
