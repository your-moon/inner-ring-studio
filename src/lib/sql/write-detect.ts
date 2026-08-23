/**
 * Conservative write detection for the production write-gate: is this
 * statement capable of changing data or schema? Errs toward "yes" — the cost
 * of a false positive is one extra confirmation; the cost of a false negative
 * is an unconfirmed write on prod.
 */

const WRITE_HEAD =
  /^(insert|update|delete|merge|replace|drop|alter|truncate|create|grant|revoke|vacuum|reindex|comment|refresh|call|do|copy|import|rename|optimize|attach|detach|set\s+global)\b/i;

/** Strip leading whitespace and SQL comments (line and block). */
function stripLeading(sql: string): string {
  let s = sql;
  for (;;) {
    const before = s;
    s = s.replace(/^\s+/, "");
    s = s.replace(/^--[^\n]*\n?/, "");
    s = s.replace(/^\/\*[\s\S]*?\*\//, "");
    if (s === before) return s;
  }
}

export function statementIsWrite(sql: string): boolean {
  const s = stripLeading(sql);
  if (s === "") return false;
  // CTEs: `WITH x AS (...) INSERT/UPDATE/DELETE ...` writes; a pure
  // `WITH ... SELECT` doesn't. Scanning for the verbs inside is conservative
  // but a data-modifying CTE (`WITH d AS (DELETE ...) SELECT`) makes anything
  // finer-grained unsafe.
  if (/^with\b/i.test(s)) {
    return /\b(insert|update|delete|merge)\b/i.test(s);
  }
  return WRITE_HEAD.test(s);
}

/** True when any statement in the batch writes. */
export function anyStatementWrites(statements: string[]): boolean {
  return statements.some(statementIsWrite);
}
