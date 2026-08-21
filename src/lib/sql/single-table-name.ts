/**
 * Best-effort extraction of the single table a SELECT reads from — used to name
 * an export file and label a result tab. Returns null when the query reads from
 * more than one table (any JOIN, or a comma-separated FROM list) or has no FROM
 * at all. A heuristic regex parser, not a real SQL parser; it errs toward null.
 */
export function getSingleTableName(query: string): string | null {
  try {
    // Normalize query by removing extra spaces and converting to lowercase
    const normalizedQuery = query.replace(/\s+/g, " ").trim().toLowerCase();

    // Match the table names after "from" keyword
    const fromMatch = normalizedQuery.match(
      /from\s+([^\s,;]+(?:\s*,\s*[^\s,;]+)*)/i
    );
    const joinMatches = normalizedQuery.match(/join\s+([^\s,;]+)/gi);

    // If there are JOINs, more than one table is referenced
    if (joinMatches && joinMatches.length > 0) {
      return null;
    }

    // Check if a single table is present
    if (fromMatch) {
      const tableName = fromMatch[1];

      // Ensure no additional tables are mentioned
      const additionalTablesMatch = tableName.match(/,\s*[^\s,;]+/);
      if (additionalTablesMatch) {
        return null;
      }

      return tableName;
    }

    // No table found
    return null;
  } catch {
    return null;
  }
}
