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
