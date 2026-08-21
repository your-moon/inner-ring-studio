// Golden-master (characterization) test for the three per-dialect table-schema
// DDL generators. It snapshots the CURRENT output across a change matrix so the
// planned consolidation into one generic generator + dialect descriptors can be
// proven byte-identical. pg/mysql had no tests before this.
import { escapeSqlValue } from "@/drivers/sqlite/sql-helper";
import type {
  BaseDriver,
  DatabaseTableColumn,
  DatabaseTableColumnConstraint,
  DatabaseTableSchemaChange,
} from "@/drivers/base-driver";
import { generatePostgresSchemaChange } from "@/drivers/postgres/generate-schema";
import { generateMySqlSchemaChange } from "@/drivers/mysql/generate-schema";
import generateSqlSchemaChange from "@/drivers/sqlite/sqlite-generate-schema";

// Minimal drivers exposing only the escape methods the generators use — matched
// to the real drivers: pg quotes with "…", mysql with `…`, both share escapeSqlValue.
const pg = {
  escapeId: (id: string) => `"${id.replace(/"/g, '""')}"`,
  escapeValue: (v: unknown) => escapeSqlValue(v),
} as unknown as BaseDriver;
const my = {
  escapeId: (id: string) => `\`${id.replace(/`/g, "``")}\``,
  escapeValue: (v: unknown) => escapeSqlValue(v),
} as unknown as BaseDriver;

// Run one change through all three dialects.
const all = (change: DatabaseTableSchemaChange) => ({
  postgres: generatePostgresSchemaChange(pg, change),
  mysql: generateMySqlSchemaChange(my, change),
  sqlite: generateSqlSchemaChange(change),
});

const col = (
  name: string,
  type: string,
  constraint: DatabaseTableColumnConstraint = {}
): DatabaseTableColumn => ({ name, type, constraint });

describe("generate table schema DDL — golden output across dialects", () => {
  test("create table: pk+autoincrement, not null, default, unique", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: null, new: "users" },
      schemaName: "public",
      columns: [
        { old: null, new: col("id", "integer", { primaryKey: true, autoIncrement: true }) },
        { old: null, new: col("email", "text", { notNull: true, unique: true }) },
        { old: null, new: col("role", "text", { defaultValue: "member" }) },
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: add column", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [{ old: null, new: col("age", "integer", {}) }],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: drop column", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [{ old: col("age", "integer", {}), new: null }],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: rename column", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [
        { old: col("email", "text", {}), new: col("email_address", "text", {}) },
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: change column type (the divergent path)", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [
        { old: col("age", "integer", {}), new: col("age", "bigint", {}) },
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: rename table", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "accounts" },
      schemaName: "public",
      columns: [],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("create table: foreign key column + check + collate", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: null, new: "orders" },
      schemaName: "public",
      columns: [
        { old: null, new: col("id", "integer", { primaryKey: true }) },
        {
          old: null,
          new: col("user_id", "integer", {
            foreignKey: {
              foreignTableName: "users",
              foreignColumns: ["id"],
            },
          }),
        },
        { old: null, new: col("code", "text", { collate: "NOCASE", checkExpression: "length(code) > 0" }) },
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("create table: table-level constraints (pk, unique, fk)", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: null, new: "membership" },
      schemaName: "public",
      columns: [
        { old: null, new: col("user_id", "integer", {}) },
        { old: null, new: col("team_id", "integer", {}) },
      ],
      constraints: [
        { old: null, new: { primaryKey: true, primaryColumns: ["user_id", "team_id"] } },
        { old: null, new: { foreignKey: { columns: ["team_id"], foreignTableName: "teams", foreignColumns: ["id"] } } },
      ],
    };
    expect(all(change)).toMatchSnapshot();
  });
});
