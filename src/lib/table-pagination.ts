/**
 * The table browser's page controls (the limit/offset inputs + prev/next
 * buttons). Pure helpers so the parse/clamp/step math is in one tested place
 * instead of hand-inlined across the toolbar handlers.
 *
 * Distinct from the executor "Cursor" (the opaque next-page token in
 * CONTEXT.md): this is the user-facing offset/limit paging of the table view.
 */

/**
 * Parse a user-typed page value (limit or offset). Non-numeric or empty input
 * returns `fallback` (never NaN — parseInt does not throw, it returns NaN, which
 * the old try/catch never caught); a negative number clamps to 0.
 */
export function parsePageValue(input: string, fallback: number): number {
  const n = parseInt(input, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

/** Offset of the previous page, clamped so it can never go below 0. */
export function prevOffset(offset: number, limit: number): number {
  return Math.max(0, offset - limit);
}

/** Offset of the next page. */
export function nextOffset(offset: number, limit: number): number {
  return offset + limit;
}

/** Whether a previous page exists (used to disable the prev button). */
export function canGoPrev(offset: number): boolean {
  return offset > 0;
}
