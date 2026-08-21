// The pure middle of the query-run pipeline, lifted out of the query-tab
// component so it is testable and reusable: explain-prefixing, placeholder
// discovery + substitution, and post-run schema-change detection. No React, no
// editor, no I/O — the component still owns reading the editor, running
// `multipleQuery`, toasts, history, and schema refresh.

import { escapeSqlValue, extractInputValue } from "@/drivers/sqlite/sql-helper";
import { tokenizeSql } from "@outerbase/sdk-transform";

/** Prefix a statement with the dialect's EXPLAIN form, unless it already is one. */
export function withExplain(sql: string, dialect: string): string {
  if (sql.toLowerCase().indexOf("explain query plan") === 0) return sql;
  if (dialect === "sqlite") return "explain query plan " + sql;
  if (dialect === "mysql") return "explain format=json " + sql;
  if (dialect === "postgres") return "explain (format json) " + sql;
  return sql;
}

/** The placeholder names (`:name` → `name`) referenced by a statement. */
export function discoverPlaceholders(sql: string, dialect: string): string[] {
  return tokenizeSql(sql, dialect as Parameters<typeof tokenizeSql>[1])
    .filter((t) => t.type === "PLACEHOLDER")
    .map((t) => t.value.slice(1));
}

export type PrepareResult =
  | { ok: true; run: string[]; history: string[] }
  | { ok: false; message: string; analytics?: { name: string; data: unknown }[] };

/**
 * Turn the statements the user asked to run into what actually executes.
 * For each: optionally EXPLAIN-prefix it, then substitute its `:placeholders`
 * with their escaped values. Returns two parallel lists — `run` (substituted,
 * executed) and `history` (pre-substitution, recorded) — so placeholder VALUES
 * never leak into query history. On a tokenize failure or an unfilled
 * placeholder it returns `ok: false` with a message (and, for the tokenize
 * case, an analytics event) instead of throwing, so the caller decides how to
 * surface it — and can do so before any loading state is set.
 */
export function prepareStatements(
  statements: string[],
  opts: {
    dialect: string;
    explained: boolean;
    placeholders: Record<string, string>;
  }
): PrepareResult {
  const run: string[] = [];
  const history: string[] = [];
  for (const raw of statements) {
    const stmt = opts.explained ? withExplain(raw, opts.dialect) : raw;
    const token = tokenizeSql(stmt, opts.dialect as Parameters<typeof tokenizeSql>[1]);

    // Defensive: the tokenizer handed the input straight back (couldn't parse).
    if (token.join("") === stmt) {
      return {
        ok: false,
        message: "Failed to tokenize SQL statement",
        analytics: [{ name: "tokenize_mismatch", data: { token, statement: stmt } }],
      };
    }

    const vars = token
      .filter((t) => t.type === "PLACEHOLDER")
      .map((t) => t.value.slice(1));
    if (vars.length > 0 && vars.some((p) => (opts.placeholders[p] ?? "") === "")) {
      return { ok: false, message: "Please fill in all placeholders" };
    }

    history.push(stmt);
    run.push(
      token
        .map((t) =>
          t.type === "PLACEHOLDER"
            ? escapeSqlValue(extractInputValue(opts.placeholders[t.value.slice(1)]))
            : t.value
        )
        .join("")
    );
  }
  return { ok: true, run, history };
}

/**
 * Whether any executed statement changed the schema, so the caller knows to
 * refresh it. Detects CREATE / DROP (and USE when the dialect supports it) —
 * matching the previous inline check exactly.
 */
export function sqlAltersSchema(
  logs: { sql: string }[],
  opts: { supportUseStatement?: boolean }
): boolean {
  for (const log of logs) {
    const s = log.sql.trim().toLowerCase();
    if (s.startsWith("create ")) return true;
    if (s.startsWith("drop ")) return true;
    if (opts.supportUseStatement && s.startsWith("use ")) return true;
  }
  return false;
}
