import { isEqual, omit } from "lodash";
import type {
  DatabaseTableColumn,
  DatabaseTableColumnConstraint,
  DatabaseTableSchemaChange,
} from "./base-driver";

// One generic table-schema-change DDL generator, shared by the Postgres, MySQL,
// and SQLite drivers (which used to keep three near-identical copies). Each
// driver supplies a small SqlDialectSpec describing only what actually varies;
// the CREATE assembly, the drop/add/rename-column loop, column rendering, and
// table-level constraints all live here once.

/** Helpers a dialect's `alterColumn` may use to render the changed column. */
export interface AlterColumnContext {
  createColumn(col: DatabaseTableColumn, edit?: boolean): string;
  escapeId(id: string): string;
  escapeValue(value: unknown): string;
  generateConstraintScript(
    con: DatabaseTableColumnConstraint
  ): string | undefined;
}

/** The (small) surface that genuinely differs between SQL dialects. */
export interface SqlDialectSpec {
  escapeId(id: string): string;
  escapeValue(value: unknown): string;
  /** Auto-increment token inside a PRIMARY KEY clause. */
  autoIncrement: string;
  /** Inline column FK keyword: "FOREIGN KEY REFERENCES" (pg) or "REFERENCES". */
  columnForeignKeyKeyword: string;
  supportsCollate: boolean;
  /** Whether `wrapParen` leaves a bare NULL unwrapped (pg/mysql) or not (sqlite). */
  wrapParenGuardsNull: boolean;
  /** Whether `RENAME TO` is schema-qualified (pg/mysql) or bare (sqlite). */
  renameToIncludesSchema: boolean;
  /** The one behaviour that truly differs per dialect: how a *changed* column
   *  is altered (pg ALTER COLUMN TYPE…USING + constraint rewrite, mysql MODIFY
   *  COLUMN, sqlite ALTER COLUMN…TO). Returns the line(s) to emit. */
  alterColumn(
    col: DatabaseTableColumn,
    tableNameOld: string,
    ctx: AlterColumnContext
  ): string[];
}

export function generateTableSchemaChange(
  change: DatabaseTableSchemaChange,
  d: SqlDialectSpec
): string[] {
  const wrapParen = (str: string) => {
    if (d.wrapParenGuardsNull && str.toUpperCase() === "NULL") return str;
    if (str.length >= 2 && str.startsWith("(") && str.endsWith(")")) return str;
    return "(" + str + ")";
  };

  const createColumn = (col: DatabaseTableColumn, edit?: boolean): string => {
    const tokens: string[] = edit
      ? [
          d.escapeId(col.name),
          "TYPE",
          col.type,
          "USING",
          `${d.escapeId(col.name)}::${col.type}`,
        ]
      : [d.escapeId(col.name), col.type];

    const c = col.constraint;
    if (c?.primaryKey) {
      tokens.push(
        [
          "PRIMARY KEY",
          c.primaryKeyOrder,
          c.primaryKeyConflict ? `ON CONFLICT ${c.primaryKeyConflict}` : undefined,
          c.autoIncrement ? d.autoIncrement : undefined,
        ]
          .filter(Boolean)
          .join(" ")
      );
    }
    if (c?.unique) {
      tokens.push(
        ["UNIQUE", c.uniqueConflict ? `ON CONFLICT ${c.uniqueConflict}` : undefined]
          .filter(Boolean)
          .join(" ")
      );
    }
    if (c?.notNull) {
      tokens.push(
        ["NOT NULL", c.notNullConflict ? `ON CONFLICT ${c.notNullConflict}` : undefined]
          .filter(Boolean)
          .join(" ")
      );
    }
    if (c?.defaultValue) {
      tokens.push(["DEFAULT", d.escapeValue(c.defaultValue)].join(" "));
    }
    if (c?.defaultExpression) {
      tokens.push(["DEFAULT", wrapParen(c.defaultExpression)].join(" "));
    }
    if (c?.generatedExpression) {
      tokens.push(
        ["GENERATED ALWAYS AS", wrapParen(c.generatedExpression), c.generatedType].join(" ")
      );
    }
    if (d.supportsCollate && c?.collate) {
      tokens.push("COLLATE " + d.escapeValue(c.collate));
    }
    if (c?.checkExpression) {
      tokens.push("CHECK " + wrapParen(c.checkExpression));
    }
    const foreignTableName = c?.foreignKey?.foreignTableName;
    const foreignColumnName = (c?.foreignKey?.foreignColumns ?? [undefined])[0];
    if (foreignTableName && foreignColumnName) {
      tokens.push(
        [
          d.columnForeignKeyKeyword,
          d.escapeId(foreignTableName) + `(${d.escapeId(foreignColumnName)})`,
        ].join(" ")
      );
    }
    return tokens.join(" ");
  };

  const generateConstraintScript = (
    con: DatabaseTableColumnConstraint
  ): string | undefined => {
    if (con.primaryKey) {
      return `PRIMARY KEY (${con.primaryColumns?.map(d.escapeId).join(", ")})`;
    } else if (con.unique) {
      return `UNIQUE (${con.uniqueColumns?.map(d.escapeId).join(", ")})`;
    } else if (con.checkExpression !== undefined) {
      return `CHECK (${con.checkExpression})`;
    } else if (con.foreignKey) {
      return (
        `FOREIGN KEY (${con.foreignKey.columns?.map(d.escapeId).join(", ")}) ` +
        `REFERENCES ${d.escapeId(con.foreignKey.foreignTableName ?? "")} ` +
        `(${con.foreignKey.foreignColumns?.map(d.escapeId).join(", ")})`
      );
    }
  };

  const ctx: AlterColumnContext = {
    createColumn,
    escapeId: d.escapeId,
    escapeValue: d.escapeValue,
    generateConstraintScript,
  };

  const isCreateScript = !change.name.old;
  const lines: string[] = [];

  for (const col of change.columns) {
    if (col.new === null) {
      lines.push(`DROP COLUMN ${col.old?.name}`);
    } else if (col.old === null) {
      lines.push(
        isCreateScript
          ? createColumn(col.new)
          : "ADD " + createColumn(col.new)
      );
    } else {
      if (col.new.name !== col.old.name) {
        lines.push(
          `RENAME COLUMN ${d.escapeId(col.old.name)} TO ${d.escapeId(col.new.name)}`
        );
      }
      if (!isEqual(omit(col.old, ["name"]), omit(col.new, ["name"]))) {
        for (const line of d.alterColumn(col.new, change.name.old ?? "", ctx)) {
          lines.push(line);
        }
      }
    }
  }

  for (const con of change.constraints) {
    if (con.new && isCreateScript) {
      const script = generateConstraintScript(con.new);
      if (script !== undefined) lines.push(script);
    }
  }

  if (!isCreateScript && change.name.new !== change.name.old) {
    lines.push(
      d.renameToIncludesSchema
        ? `RENAME TO ${d.escapeId(change.schemaName ?? "main")}.${d.escapeId(change.name.new ?? "")}`
        : `RENAME TO ${d.escapeId(change.name.new ?? "")}`
    );
  }

  if (isCreateScript) {
    return [
      `CREATE TABLE ${d.escapeId(change.schemaName ?? "main")}.${d.escapeId(
        change.name.new || "no_table_name"
      )}(\n${lines.map((line) => "  " + line).join(",\n")}\n)`,
    ];
  }
  const alter = `ALTER TABLE ${d.escapeId(change.schemaName ?? "main")}.${d.escapeId(change.name.old ?? "")} `;
  return lines.map((line) => alter + line);
}
