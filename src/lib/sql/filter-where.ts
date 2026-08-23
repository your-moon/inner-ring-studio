/**
 * Build the WHERE clause for the table browser's filters: the user's manual
 * filter (inserted verbatim) AND a per-column "contains" search. The search is
 * dialect-specific — MySQL/ClickHouse use LIKE, Postgres uses a case-insensitive
 * CAST(... AS TEXT) ILIKE — and each identifier is escaped for its dialect.
 *
 * Pure and dialect-parametrized so the escaping (an injection surface) is
 * testable in isolation. The value escaper is injected — the caller passes its
 * driver's escapeSqlValue — so this module stays free of the heavy driver graph.
 */
export function buildFilterWhere(
  dialect: string,
  where: string,
  columnFilters: Record<string, string>,
  escapeValue: (value: string) => string
): string {
  const clause = (col: string, term: string): string => {
    const val = escapeValue(`%${term}%`);
    if (dialect === "mysql") {
      return "`" + col.replace(/`/g, "``") + "` LIKE " + val;
    }
    const q = '"' + col.replace(/"/g, '""') + '"';
    return dialect === "postgres"
      ? `CAST(${q} AS TEXT) ILIKE ${val}`
      : `${q} LIKE ${val}`;
  };

  const parts: string[] = [];
  if (where.trim()) parts.push(`(${where})`);
  for (const [col, term] of Object.entries(columnFilters)) {
    if (term.trim()) parts.push(clause(col, term.trim()));
  }
  return parts.join(" AND ");
}

// ── Structured filter rules (the "+ Filter" chip builder) ──────────────────

export type FilterOp =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "is null"
  | "is not null"
  | "raw";

export interface ColumnFilterRule {
  /** Column name; ignored for `raw`. */
  column: string;
  op: FilterOp;
  /** Comparison value / contains term / raw SQL expression. */
  value?: string;
}

export const FILTER_OPS: FilterOp[] = [
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "contains",
  "is null",
  "is not null",
  "raw",
];

function escapeIdent(dialect: string, col: string): string {
  return dialect === "mysql"
    ? "`" + col.replace(/`/g, "``") + "`"
    : '"' + col.replace(/"/g, '""') + '"';
}

/** Human-readable chip label for a rule. */
export function ruleLabel(rule: ColumnFilterRule): string {
  if (rule.op === "raw") return rule.value ?? "";
  if (rule.op === "is null" || rule.op === "is not null")
    return `${rule.column} ${rule.op}`;
  if (rule.op === "contains") return `${rule.column} contains “${rule.value}”`;
  return `${rule.column} ${rule.op} ${rule.value}`;
}

/**
 * Compile structured rules to a WHERE fragment. Values go through the
 * driver's string escaper; purely numeric values are emitted as numbers so
 * numeric columns compare naturally on every dialect.
 */
export function buildRulesWhere(
  dialect: string,
  rules: ColumnFilterRule[],
  escapeValue: (value: string) => string
): string {
  const valueSql = (v: string): string =>
    /^-?\d+(\.\d+)?$/.test(v.trim()) ? v.trim() : escapeValue(v);

  const parts: string[] = [];
  for (const r of rules) {
    if (r.op === "raw") {
      if (r.value?.trim()) parts.push(`(${r.value})`);
      continue;
    }
    const q = escapeIdent(dialect, r.column);
    if (r.op === "is null") parts.push(`${q} IS NULL`);
    else if (r.op === "is not null") parts.push(`${q} IS NOT NULL`);
    else if (r.op === "contains") {
      const val = escapeValue(`%${r.value ?? ""}%`);
      parts.push(
        dialect === "postgres"
          ? `CAST(${q} AS TEXT) ILIKE ${val}`
          : `${q} LIKE ${val}`
      );
    } else {
      parts.push(`${q} ${r.op} ${valueSql(r.value ?? "")}`);
    }
  }
  return parts.join(" AND ");
}
