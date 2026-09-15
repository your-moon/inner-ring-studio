// Golden-master (characterization) test for the three per-dialect table-schema
// DDL generators. It snapshots the CURRENT output across a change matrix so the
// planned consolidation into one generic generator + dialect descriptors can be
// proven byte-identical. pg/mysql had no tests before this.
import { escapeSqlValue } from "@/drivers/sqlite/sql-helper";
import type {
  BaseDriver,
  DatabaseTableColumn,
  DatabaseTableColumnChange,
  DatabaseTableColumnConstraint,
  DatabaseTableConstraintChange,
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

const colChange = (
  oldCol: DatabaseTableColumn | null,
  newCol: DatabaseTableColumn | null
): DatabaseTableColumnChange => ({
  // `key` is a stable UI identity for the row; no generator reads it, so the
  // column name keeps fixtures readable without affecting golden output.
  key: (newCol ?? oldCol)?.name ?? "",
  old: oldCol,
  new: newCol,
});

const constraintChange = (
  id: string,
  oldConstraint: DatabaseTableColumnConstraint | null,
  newConstraint: DatabaseTableColumnConstraint | null
): DatabaseTableConstraintChange => ({
  // `id` is a stable UI identity for the row; no generator reads it.
  id,
  old: oldConstraint,
  new: newConstraint,
});

describe("generate table schema DDL — golden output across dialects", () => {
  test("create table: pk+autoincrement, not null, default, unique", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: undefined, new: "users" },
      schemaName: "public",
      columns: [
        colChange(null, col("id", "integer", { primaryKey: true, autoIncrement: true })),
        colChange(null, col("email", "text", { notNull: true, unique: true })),
        colChange(null, col("role", "text", { defaultValue: "member" })),
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: add column", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [colChange(null, col("age", "integer", {}))],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: drop column", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [colChange(col("age", "integer", {}), null)],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: rename column", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [
        colChange(col("email", "text", {}), col("email_address", "text", {})),
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
        colChange(col("age", "integer", {}), col("age", "bigint", {})),
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: change type of a primary-key column (real constraint rewrite)", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "users", new: "users" },
      schemaName: "public",
      columns: [
        colChange(
          col("id", "integer", { primaryKey: true }),
          col("id", "bigint", { primaryKey: true })
        ),
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("alter: change type of a foreign-key column (real constraint rewrite)", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: "orders", new: "orders" },
      schemaName: "public",
      columns: [
        colChange(
          col("user_id", "integer", {
            foreignKey: { foreignTableName: "users", foreignColumns: ["id"] },
          }),
          col("user_id", "bigint", {
            foreignKey: { foreignTableName: "users", foreignColumns: ["id"] },
          })
        ),
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
      name: { old: undefined, new: "orders" },
      schemaName: "public",
      columns: [
        colChange(null, col("id", "integer", { primaryKey: true })),
        colChange(
          null,
          col("user_id", "integer", {
            foreignKey: {
              foreignTableName: "users",
              foreignColumns: ["id"],
            },
          })
        ),
        colChange(null, col("code", "text", { collate: "NOCASE", checkExpression: "length(code) > 0" })),
      ],
      constraints: [],
    };
    expect(all(change)).toMatchSnapshot();
  });

  test("create table: table-level constraints (pk, unique, fk)", () => {
    const change: DatabaseTableSchemaChange = {
      name: { old: undefined, new: "membership" },
      schemaName: "public",
      columns: [
        colChange(null, col("user_id", "integer", {})),
        colChange(null, col("team_id", "integer", {})),
      ],
      constraints: [
        constraintChange("pk", null, { primaryKey: true, primaryColumns: ["user_id", "team_id"] }),
        constraintChange("fk", null, { foreignKey: { columns: ["team_id"], foreignTableName: "teams", foreignColumns: ["id"] } }),
      ],
    };
    expect(all(change)).toMatchSnapshot();
  });
});
