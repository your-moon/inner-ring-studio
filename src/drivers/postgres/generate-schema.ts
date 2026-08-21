import { BaseDriver, DatabaseTableColumnConstraint } from "../base-driver";
import type { DatabaseTableSchemaChange } from "../base-driver";
import {
  type AlterColumnContext,
  generateTableSchemaChange,
} from "../sql-schema-change";

// Postgres alters a changed column with `ALTER COLUMN … TYPE … USING …`, then
// rewrites the column's constraint by name (`<table>_pkey` / `_fkey` / `_key`).
function pgConstraintModify(
  con: DatabaseTableColumnConstraint,
  tableName: string,
  ctx: AlterColumnContext
): string[] {
  let keyName = "";
  if (con?.primaryKey) keyName = `${tableName}_pkey`;
  if (con?.foreignKey)
    keyName = `${tableName}_${con.foreignKey.foreignTableName}_${con.foreignKey.columns?.join("")}_fkey`;
  if (con.unique) keyName = `${tableName}_${con.uniqueColumns?.join("")}_key`;

  return [
    `DROP CONSTRAINT IF EXISTS ${keyName}`,
    `ADD CONSTRAINT ${keyName} ${ctx.generateConstraintScript(con)}`,
  ];
}

// https://www.postgresql.org/docs/current/sql-createtable.html
export function generatePostgresSchemaChange(
  driver: BaseDriver,
  change: DatabaseTableSchemaChange
): string[] {
  return generateTableSchemaChange(change, {
    escapeId: (id) => driver.escapeId(id),
    escapeValue: (v) => driver.escapeValue(v),
    autoIncrement: "GENERATED ALWAYS AS IDENTITY",
    columnForeignKeyKeyword: "FOREIGN KEY REFERENCES",
    supportsCollate: true,
    wrapParenGuardsNull: true,
    renameToIncludesSchema: true,
    alterColumn: (col, tableNameOld, ctx) => {
      const lines = [
        `ALTER COLUMN ${ctx.createColumn(
          { name: col.name, type: col.type, pk: col.pk, constraint: {} },
          true
        )}`,
      ];
      if (col.constraint) {
        for (const s of pgConstraintModify(
          {
            ...col.constraint,
            primaryColumns: [col.name],
            uniqueColumns: [col.name],
            foreignKey: { ...col.constraint.foreignKey, columns: [col.name] },
          },
          tableNameOld,
          ctx
        )) {
          lines.push(s);
        }
      }
      return lines;
    },
  });
}
