import PostgresLikeDriver from "../postgres/postgres-driver";
import {
  DatabaseSchemaItem,
  DatabaseSchemas,
  DatabaseTableColumn,
  DatabaseTableSchema,
} from "../base-driver";

const CH_SYS = "('system','information_schema','INFORMATION_SCHEMA')";

/**
 * Read-focused ClickHouse driver. Reuses the SQL-editor + grid machinery from
 * PostgresLikeDriver but replaces introspection with ClickHouse system tables
 * and uses backtick identifier quoting. ClickHouse has no row-level PK/UPDATE,
 * so tables have no `pk` and the grid stays read-only.
 */
export default class ClickhouseDriver extends PostgresLikeDriver {
  escapeId(id: string): string {
    return "`" + id.replace(/`/g, "``") + "`";
  }

  async getCurrentSchema(): Promise<string | null> {
    try {
      const r = await this.query("SELECT currentDatabase() AS db");
      return (r.rows[0]?.db as string) ?? null;
    } catch {
      return null;
    }
  }

  async schemas(): Promise<DatabaseSchemas> {
    const dbRes = await this.query(
      `SELECT name FROM system.databases WHERE name NOT IN ${CH_SYS} ORDER BY name`
    );
    const tblRes = await this.query(
      `SELECT database, name, engine, total_bytes FROM system.tables WHERE database NOT IN ${CH_SYS} ORDER BY database, name`
    );
    const colRes = await this.query(
      `SELECT database, table, name, type FROM system.columns WHERE database NOT IN ${CH_SYS} ORDER BY database, table, position`
    );

    const schemas: DatabaseSchemas = {};
    for (const row of dbRes.rows) schemas[row.name as string] = [];

    const tableRecord: Record<string, DatabaseSchemaItem> = {};
    for (const t of tblRes.rows) {
      const db = t.database as string;
      const name = t.name as string;
      const engine = String(t.engine ?? "");
      const item: DatabaseSchemaItem = {
        name,
        schemaName: db,
        type: /view/i.test(engine) ? "view" : "table",
        tableName: name,
        tableSchema: {
          stats: { sizeInByte: Number(t.total_bytes ?? 0) || 0 },
          columns: [],
          constraints: [],
          pk: [],
          autoIncrement: false,
          schemaName: db,
          tableName: name,
        },
      };
      tableRecord[`${db}.${name}`] = item;
      if (schemas[db]) schemas[db].push(item);
    }

    for (const c of colRes.rows) {
      const key = `${c.database}.${c.table}`;
      const col: DatabaseTableColumn = {
        name: c.name as string,
        type: c.type as string,
        constraint: { notNull: !/Nullable/.test(String(c.type ?? "")) },
      };
      tableRecord[key]?.tableSchema?.columns.push(col);
    }

    return schemas;
  }

  /**
   * Single-table schema for the grid. The inherited Postgres version queries
   * information_schema.constraint_column_usage, which ClickHouse doesn't have —
   * so read columns from system.columns and report no constraints (ClickHouse
   * has no SQL PK/FK constraints).
   */
  async tableSchema(
    schemaName: string,
    tableName: string
  ): Promise<DatabaseTableSchema> {
    const colRes = await this.query(
      `SELECT name, type FROM system.columns WHERE database = ${this.escapeValue(
        schemaName
      )} AND table = ${this.escapeValue(tableName)} ORDER BY position`
    );
    const sizeRes = await this.query(
      `SELECT total_bytes FROM system.tables WHERE database = ${this.escapeValue(
        schemaName
      )} AND name = ${this.escapeValue(tableName)}`
    );
    const size = Number(sizeRes.rows[0]?.total_bytes ?? 0) || 0;

    return {
      columns: colRes.rows.map((c) => ({
        name: c.name as string,
        type: c.type as string,
        constraint: { notNull: !/Nullable/.test(String(c.type ?? "")) },
      })),
      constraints: [],
      pk: [],
      autoIncrement: false,
      schemaName,
      tableName,
      stats: { sizeInByte: size },
    };
  }
}
