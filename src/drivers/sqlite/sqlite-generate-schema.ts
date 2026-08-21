import { escapeIdentity, escapeSqlValue } from "@/drivers/sqlite/sql-helper";
import type { DatabaseTableSchemaChange } from "@/drivers/base-driver";
import { generateTableSchemaChange } from "@/drivers/sql-schema-change";

// SQLite uses double-quoted identifiers (same as pg), bare `RENAME TO`, no
// COLLATE in column defs, and alters a changed column with `ALTER COLUMN … TO …`.
export default function generateSqlSchemaChange(
  change: DatabaseTableSchemaChange
): string[] {
  return generateTableSchemaChange(change, {
    escapeId: escapeIdentity,
    escapeValue: escapeSqlValue,
    autoIncrement: "AUTOINCREMENT",
    columnForeignKeyKeyword: "REFERENCES",
    supportsCollate: false,
    wrapParenGuardsNull: false,
    renameToIncludesSchema: false,
    alterColumn: (col, _tableNameOld, ctx) => [
      `ALTER COLUMN ${ctx.escapeId(col.name)} TO ${ctx.createColumn(col)}`,
    ],
  });
}
