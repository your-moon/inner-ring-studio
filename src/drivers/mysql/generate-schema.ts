import {
  BaseDriver,
  DatabaseSchemaChange,
  DatabaseTableSchemaChange,
  DatabaseTriggerSchema,
} from "../base-driver";
import { generateTableSchemaChange } from "../sql-schema-change";

export function generateMysqlTriggerSchema(
  driver: BaseDriver,
  change: DatabaseTriggerSchema
): string[] {
  return [
    `CREATE TRIGGER ${driver.escapeId(change.schemaName || "")}.${driver.escapeId(change.name ?? "")} \n${change.when} ${change.operation} ON ${driver.escapeId(change.tableName)} \nFOR EACH ROW \nBEGIN \n\t${change.statement} \nEND`,
  ];
}

export function generateMysqlDatabaseSchema(
  driver: BaseDriver,
  change: DatabaseSchemaChange
): string[] {
  const isCreateScript = !change.name.old;
  let line = "";

  if (change.collate) {
    line = ` COLLATE \`${change.collate}\``;
  }

  if (isCreateScript) {
    return [`CREATE DATABASE \`${change.name.new}\`${line}`];
  } else {
    return [`ALTER DATABASE \`${change.name.old}\`${line}`];
  }
}

// https://dev.mysql.com/doc/refman/8.4/en/create-table.html
export function generateMySqlSchemaChange(
  driver: BaseDriver,
  change: DatabaseTableSchemaChange
): string[] {
  return generateTableSchemaChange(change, {
    escapeId: (id) => driver.escapeId(id),
    escapeValue: (v) => driver.escapeValue(v),
    autoIncrement: "AUTO_INCREMENT",
    columnForeignKeyKeyword: "REFERENCES",
    supportsCollate: true,
    wrapParenGuardsNull: true,
    renameToIncludesSchema: true,
    alterColumn: (col, _tableNameOld, ctx) => [
      `MODIFY COLUMN ${ctx.createColumn(col)}`,
    ],
  });
}
