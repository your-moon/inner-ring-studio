"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Semantic table primitives on the Orbit tokens. Presentational building
 * blocks — for the large virtualized result grid, the studio has its own
 * engine; this is for settings tables, previews, and small result sets.
 */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="border-border-default w-full overflow-x-auto rounded-[var(--radius-panel)] border">
      <table
        className={cn("w-full border-collapse text-ui-default", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />;
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  selected?: boolean;
};

export function TableRow({ selected, className, ...props }: TableRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        "border-border-subtle border-b transition-colors last:border-0",
        "hover:bg-surface-hover data-[selected=true]:bg-surface-selected",
        className
      )}
      {...props}
    />
  );
}

export type SortDirection = "asc" | "desc" | false;

export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  /** Set to enable the sortable affordance; false shows the neutral glyph. */
  sort?: SortDirection;
  onSort?: () => void;
  numeric?: boolean;
};

export function TableHead({
  sort,
  onSort,
  numeric,
  className,
  children,
  ...props
}: TableHeadProps) {
  const sortable = sort !== undefined;
  return (
    <th
      aria-sort={
        sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined
      }
      className={cn(
        "bg-surface-canvas text-ui-caption [color:var(--content-tertiary)] h-9 px-3 font-[var(--weight-medium)] whitespace-nowrap",
        numeric ? "text-right" : "text-left",
        className
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "focus-ring -mx-1 inline-flex items-center gap-1 rounded-[var(--radius-small)] px-1 hover:[color:var(--content-primary)]",
            numeric && "flex-row-reverse"
          )}
        >
          {children}
          {sort === "asc" ? (
            <ChevronUp className="size-3" />
          ) : sort === "desc" ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronsUpDown className="size-3 opacity-50" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  numeric?: boolean;
};

export function TableCell({ numeric, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "[color:var(--content-primary)] h-9 px-3 align-middle whitespace-nowrap",
        numeric && "text-right [font-variant-numeric:tabular-nums]",
        className
      )}
      {...props}
    />
  );
}
