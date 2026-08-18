import { Button } from "@/components/orbit/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColumnSortOption } from "@/drivers/base-driver";
import {
  deleteView,
  listViews,
  newViewId,
  SavedView,
  upsertView,
} from "@/lib/saved-views";
import { LucideBookmark, LucideTrash2 } from "lucide-react";
import { useState } from "react";

interface SavedViewsButtonProps {
  scope: string;
  currentWhere: string;
  currentSort: ColumnSortOption[];
  currentColumns?: string[];
  onApply: (view: SavedView) => void;
}

/**
 * A "Views" control for the table browser: save the current filter + sort +
 * visible columns under a name, and re-apply a saved one in a click. Stored per
 * connection+table (see saved-views.ts).
 */
export default function SavedViewsButton({
  scope,
  currentWhere,
  currentSort,
  currentColumns,
  onApply,
}: SavedViewsButtonProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [name, setName] = useState("");

  const refresh = () => setViews(listViews(scope));

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) refresh();
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    upsertView(scope, {
      id: newViewId(),
      name: trimmed,
      where: currentWhere,
      sortColumns: currentSort,
      columns: currentColumns,
    });
    setName("");
    refresh();
  };

  const remove = (id: string) => {
    deleteView(scope, id);
    refresh();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-1"
        >
          <LucideBookmark className="h-4 w-4" />
          Views
          {views.length > 0 && (
            <span className="ml-1 rounded-[1px] border border-neutral-600 bg-neutral-700 px-1 text-[11px] text-neutral-100">
              {views.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="max-h-64 overflow-y-auto">
          {views.length === 0 ? (
            <p className="px-3 py-3 text-sm text-neutral-500">
              No saved views yet. Save the current filter and sort below.
            </p>
          ) : (
            views.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <button
                  className="flex grow flex-col items-start overflow-hidden text-left"
                  onClick={() => {
                    onApply(v);
                    setOpen(false);
                  }}
                >
                  <span className="w-full truncate text-sm font-medium">
                    {v.name}
                  </span>
                  <span className="w-full truncate font-mono text-xs text-neutral-500">
                    {v.where ? v.where : "no filter"}
                    {v.sortColumns.length > 0
                      ? ` · sort ${v.sortColumns
                          .map((s) => `${s.columnName} ${s.by}`)
                          .join(", ")}`
                      : ""}
                  </span>
                </button>
                <button
                  className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-600 dark:hover:bg-neutral-700"
                  title="Delete view"
                  onClick={() => remove(v.id)}
                >
                  <LucideTrash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-neutral-200 p-2 dark:border-neutral-800">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            placeholder="Name this view…"
            className="grow rounded border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={save}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
