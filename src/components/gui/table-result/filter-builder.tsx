"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ColumnFilterRule,
  FILTER_OPS,
  FilterOp,
} from "@/lib/sql/filter-where";
import { Plus } from "lucide-react";
import { useState } from "react";

const NO_VALUE_OPS: FilterOp[] = ["is null", "is not null"];

const selectClass =
  "h-7 rounded-md border border-input bg-background px-2 text-[12.5px] text-foreground outline-none focus:border-ring";

/**
 * The "+ Filter" chip builder (Attio's filter model): column → operator →
 * value, compiled to SQL by buildRulesWhere. Replaces the raw `eg: id=5` box;
 * the escape hatch survives as the "raw" operator.
 */
export default function FilterBuilder({
  columns,
  onAdd,
}: {
  columns: string[];
  onAdd: (rule: ColumnFilterRule) => void;
}) {
  const [open, setOpen] = useState(false);
  const [column, setColumn] = useState("");
  const [op, setOp] = useState<FilterOp>("=");
  const [value, setValue] = useState("");

  const effectiveColumn = column || columns[0] || "";
  const needsValue = !NO_VALUE_OPS.includes(op);
  const canAdd =
    op === "raw" ? value.trim() !== "" : effectiveColumn !== "" && (!needsValue || value !== "");

  const add = () => {
    if (!canAdd) return;
    onAdd({
      column: op === "raw" ? "" : effectiveColumn,
      op,
      value: needsValue ? value : undefined,
    });
    setValue("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="u-smooth inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2.5 text-[12.5px] text-muted-foreground hover:border-muted-foreground hover:text-foreground">
          <Plus size={12} />
          Filter
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2.5" align="start">
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            {op !== "raw" && (
              <select
                className={selectClass + " min-w-0 flex-1"}
                value={effectiveColumn}
                onChange={(e) => setColumn(e.target.value)}
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <select
              className={selectClass}
              value={op}
              onChange={(e) => setOp(e.target.value as FilterOp)}
            >
              {FILTER_OPS.map((o) => (
                <option key={o} value={o}>
                  {o === "raw" ? "raw SQL" : o}
                </option>
              ))}
            </select>
          </div>
          {needsValue && (
            <input
              autoFocus
              className="h-7 rounded-md border border-input bg-background px-2 font-mono text-[12.5px] text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus:border-ring"
              placeholder={op === "raw" ? "id % 2 = 0" : "value"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
            />
          )}
          <button
            disabled={!canAdd}
            onClick={add}
            className="h-7 rounded-md bg-primary text-[12.5px] font-medium text-primary-foreground disabled:opacity-40"
          >
            Add filter
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
