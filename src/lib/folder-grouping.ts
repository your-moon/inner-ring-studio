/**
 * Group a list of items by their optional `folder`, for the sidebar's folder
 * sections. Ungrouped items (no folder, or blank after trimming) collect under
 * the empty-string key, which always sorts first; the rest sort alphabetically.
 * Pure and generic so the grouping + ordering convention is testable on its own.
 */
export interface FolderGrouping<T> {
  /** Folder keys in display order: "" (ungrouped) first, then alphabetical. */
  keys: string[];
  groups: Map<string, T[]>;
}

export function groupByFolder<T extends { folder?: string | null }>(
  items: T[]
): FolderGrouping<T> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.folder?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  return { keys, groups };
}
