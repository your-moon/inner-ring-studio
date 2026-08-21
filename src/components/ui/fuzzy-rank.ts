// Pure fuzzy-ranking used by the QuickOpen palette. Kept dependency-free so it
// is the whole test surface: no React, no DOM, no icons.

/**
 * Fuzzy score for one candidate string against a query (lower = better,
 * Infinity = no match). The ladder:
 *   empty query 0 · exact 0 · prefix 1 · substring 2 + idx/1000 ·
 *   subsequence 5 · none Infinity
 */
export function fuzzyScore(text: string, query: string): number {
  const l = text.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  if (l === q) return 0;
  if (l.startsWith(q)) return 1;
  const idx = l.indexOf(q);
  if (idx >= 0) return 2 + idx / 1000;
  let i = 0;
  for (const ch of l) if (ch === q[i]) i++;
  return i === q.length ? 5 : Infinity;
}

/**
 * Rank items by fuzzy match on their search text. An empty query preserves the
 * caller's order (their meaningful default: frecency, recency, dynamic-then-
 * static, …); a query drops non-matches and sorts by score, stable on the
 * original index. `limit` caps the returned count when set.
 */
export function fuzzyRank<T>(
  items: T[],
  getText: (item: T) => string,
  query: string,
  limit?: number
): T[] {
  const q = query.trim();
  if (!q) return limit != null ? items.slice(0, limit) : items;
  const ranked = items
    .map((item, i) => ({ item, i, s: fuzzyScore(getText(item), q) }))
    .filter((x) => x.s !== Infinity)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.item);
  return limit != null ? ranked.slice(0, limit) : ranked;
}
