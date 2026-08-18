import { ColumnSortOption } from "@/drivers/base-driver";

/**
 * Saved table views: a named snapshot of a table-browse's filter, sort, and
 * visible columns, so you can flip back to "my open orders, newest first" in one
 * click. Stored per connection+table in localStorage, matching how the editor
 * draft and sidebar-collapse state are already persisted (keyed by pathname).
 * Local to the device, like the app's saved queries and query history.
 */
export interface SavedView {
  id: string;
  name: string;
  where: string;
  sortColumns: ColumnSortOption[];
  columns?: string[]; // visible column names; undefined = all columns
}

function keyFor(scope: string): string {
  return `pmsql.savedViews:${scope}`;
}

export function listViews(scope: string): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    return [];
  }
}

function write(scope: string, views: SavedView[]): SavedView[] {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyFor(scope), JSON.stringify(views));
  }
  return views;
}

export function newViewId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Add a new view or replace an existing one (matched by id). */
export function upsertView(scope: string, view: SavedView): SavedView[] {
  const views = listViews(scope);
  const idx = views.findIndex((v) => v.id === view.id);
  if (idx >= 0) views[idx] = view;
  else views.push(view);
  return write(scope, views);
}

export function deleteView(scope: string, id: string): SavedView[] {
  return write(
    scope,
    listViews(scope).filter((v) => v.id !== id)
  );
}
