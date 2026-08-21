import OptimizeTableState from "@/components/gui/table-optimized/optimize-table-state";
import { BaseDriver, DatabaseTableSchema } from "@/drivers/base-driver";
import { generateTableChangePlan } from "./sql-change-plan";

export type { ExecutePlan } from "./sql-change-plan";

export async function commitChange({
  driver,
  tableName,
  tableSchema,
  data,
}: {
  driver: BaseDriver;
  tableName: string;
  tableSchema: DatabaseTableSchema;
  data: OptimizeTableState;
}): Promise<{ errorMessage?: string }> {
  const plans = generateTableChangePlan({
    tableSchema,
    rows: data.getChangedRows(),
  });

  try {
    const result = await driver.updateTableData(
      tableSchema.schemaName,
      tableName,
      plans.map((p) => p.plan),
      tableSchema
    );

    data.applyChanges(
      plans.map((p, idx) => {
        return {
          row: p.row,
          updated: result[idx]?.record ?? {},
        };
      })
    );
  } catch (e) {
    return { errorMessage: (e as Error).message };
  }

  return {};
}
