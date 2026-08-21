import type { OptimizeTableRowValue } from "@/components/gui/table-optimized/optimize-table-state";
import type {
  DatabaseTableOperation,
  DatabaseTableSchema,
} from "@/drivers/base-driver";

export interface ExecutePlan {
  row: OptimizeTableRowValue;
  plan: DatabaseTableOperation;
}

/**
 * Turn a grid's changed rows into INSERT / UPDATE / DELETE plans. UPDATE and
 * DELETE are keyed by the row's ORIGINAL primary key (`row.raw`), never the
 * edited value — so editing a PK column still targets the right row. A pure
 * function of the changed rows (the caller passes `data.getChangedRows()`), so
 * it can be tested without a live table-state or the DOM.
 */
export function generateTableChangePlan({
  tableSchema,
  rows,
}: {
  tableSchema: DatabaseTableSchema;
  rows: OptimizeTableRowValue[];
}): ExecutePlan[] {
  const plans: ExecutePlan[] = [];

  for (const row of rows) {
    const rowChange = row.change;
    if (!rowChange) continue;

    const wherePrimaryKey = tableSchema.pk.reduce<Record<string, unknown>>(
      (condition, pkColumnName) => {
        condition[pkColumnName] = row.raw[pkColumnName];
        return condition;
      },
      {}
    );

    if (row.isNewRow) {
      plans.push({
        row,
        plan: {
          operation: "INSERT",
          values: rowChange,
          autoIncrementPkColumn: tableSchema.autoIncrement
            ? tableSchema.pk[0]
            : undefined,
          pk: tableSchema.pk,
        },
      });
    } else if (row.isRemoved) {
      plans.push({
        row,
        plan: { operation: "DELETE", where: wherePrimaryKey },
      });
    } else {
      plans.push({
        row,
        plan: {
          operation: "UPDATE",
          where: wherePrimaryKey,
          values: rowChange,
        },
      });
    }
  }

  return plans;
}
