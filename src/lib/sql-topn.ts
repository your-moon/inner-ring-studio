/**
 * Append a bounded LIMIT to a plain editor SELECT so Postgres runs a top-N sort
 * (index-friendly, fast) instead of materializing and sorting the whole table
 * when the user didn't write their own LIMIT.
 *
 * Conservative by design: only a single, lock-free, side-effect-free SELECT is
 * touched. Anything ambiguous is returned unchanged so we never alter results.
 */
export function wrapForTopN(sql: string, maxRows: number): string {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (!/^select\b/i.test(trimmed)) return sql;
  if (/;/.test(trimmed)) return sql; // multiple statements
  if (/\b(limit|offset)\b/i.test(trimmed)) return sql;
  if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/i.test(trimmed))
    return sql;
  if (/\binto\b/i.test(trimmed)) return sql; // SELECT INTO
  // Append (not wrap) so Postgres can use an index for ORDER BY … LIMIT and
  // return instantly instead of sorting the whole table.
  return `${trimmed} LIMIT ${maxRows}`;
}
