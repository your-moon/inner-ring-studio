import deepEqual from "deep-equal";

/**
 * The decision at the heart of editing a grid cell: given a row's current pending
 * change, what is the change after setting `columnName` to `newValue`? Setting a
 * value back to its original (deep-equal to `oldValue`) removes that cell's edit;
 * emptying the last edited cell returns `undefined`, meaning "this row is no
 * longer dirty".
 *
 * Pure and immutable — it never mutates the input change. Extracted from
 * OptimizeTableState.changeValue so this revert/clear bookkeeping (where a
 * dropped edit or a phantom-dirty row would hide) is testable on its own; the
 * class still owns the change-log registration keyed off an undefined result.
 */
export function nextRowChange(
  current: Record<string, unknown> | undefined,
  columnName: string,
  oldValue: unknown,
  newValue: unknown
): Record<string, unknown> | undefined {
  if (deepEqual(oldValue, newValue)) {
    // Reverting to the original: drop this cell's edit.
    if (!current || !(columnName in current)) return current;
    const next = { ...current };
    delete next[columnName];
    return Object.keys(next).length === 0 ? undefined : next;
  }
  return { ...(current ?? {}), [columnName]: newValue };
}
