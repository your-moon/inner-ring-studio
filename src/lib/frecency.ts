// Zoxide-style frecency: an item's rank is its access count weighted by how
// recently it was last used — recent accesses count for much more than old
// ones. The age buckets match zoxide's: <1h ×4, <1day ×2, <1week ×0.5,
// older ×0.25. Shared by the query-history and table-usage rankers so the two
// can never drift apart.

const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

/** Recency multiplier for an age in milliseconds (zoxide's buckets). */
export function recencyWeight(ageMs: number): number {
  if (ageMs < HOUR) return 4;
  if (ageMs < DAY) return 2;
  if (ageMs < WEEK) return 0.5;
  return 0.25;
}

/** Frecency score for an item: higher = used more often and more recently. */
export function frecencyScore(
  count: number,
  lastAccessMs: number,
  now: number
): number {
  return count * recencyWeight(now - lastAccessMs);
}
