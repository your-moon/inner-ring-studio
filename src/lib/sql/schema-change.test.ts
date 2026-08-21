// Tests the schema-change builder — the pure functions that turn a user's edit
// intent into the next DatabaseTableSchemaChange. This logic used to live only
// inside the schema-editor's setState closures (untestable without mounting);
// these tests are the point of extracting it.
import type {
  DatabaseTableColumn,
  DatabaseTableSchema,
  DatabaseTableSchemaChange,
} from "@/drivers/base-driver";
import {
  addColumn,
  addConstraint,
  changeColumn,
  changeConstraint,
  createTableSchemaDraft,
  discardChanges,
  removeConstraint,
  renameTable,
  reorderColumn,
  setSchemaName,
} from "./schema-change";

const col = (
  name: string,
  type = "text",
  constraint: DatabaseTableColumn["constraint"] = {}
): DatabaseTableColumn => ({ name, type, constraint });

// A change with two persisted columns (id pk, email) and no pending edits.
function baseChange(): DatabaseTableSchemaChange {
  const schema: DatabaseTableSchema = {
    tableName: "users",
    columns: [col("id", "integer", { primaryKey: true }), col("email")],
    constraints: [],
    pk: ["id"],
    autoIncrement: false,
    schemaName: "public",
  } as unknown as DatabaseTableSchema;
  return createTableSchemaDraft("public", schema);
}

const keyOf = (c: DatabaseTableSchemaChange, name: string) =>
  c.columns.find((x) => x.new?.name === name || x.old?.name === name)!.key;

describe("schema-change builder", () => {
  test("changeColumn merges a patch into the column's new side", () => {
    const c = baseChange();
    const next = changeColumn(c, keyOf(c, "email"), { name: "email_address" });
    const edited = next.columns.find((x) => x.old?.name === "email")!;
    expect(edited.new).toMatchObject({ name: "email_address", type: "text" });
    // input is not mutated (strict immutability)
    expect(c.columns.find((x) => x.old?.name === "email")!.new!.name).toBe("email");
  });

  test("changeColumn deep-merges the constraint rather than replacing it", () => {
    let c = baseChange();
    c = changeColumn(c, keyOf(c, "email"), { constraint: { notNull: true } });
    c = changeColumn(c, keyOf(c, "email"), { constraint: { unique: true } });
    const edited = c.columns.find((x) => x.old?.name === "email")!;
    expect(edited.new!.constraint).toMatchObject({ notNull: true, unique: true });
  });

  test("clearing a freshly-added column removes it; clearing an existing one marks a drop", () => {
    let c = addColumn(baseChange(), { idType: "integer", textType: "text" });
    const addedKey = c.columns.at(-1)!.key;
    c = changeColumn(c, addedKey, null);
    expect(c.columns.some((x) => x.key === addedKey)).toBe(false);

    let d = baseChange();
    d = changeColumn(d, keyOf(d, "email"), null);
    const dropped = d.columns.find((x) => x.old?.name === "email")!;
    expect(dropped.new).toBeNull();
    expect(dropped.old).not.toBeNull();
  });

  test("addColumn: first column is an id primary key; later ones are text", () => {
    const empty: DatabaseTableSchemaChange = {
      schemaName: "public",
      name: { old: "", new: "" },
      columns: [],
      constraints: [],
    };
    const one = addColumn(empty, { idType: "bigint", textType: "varchar" });
    expect(one.columns).toHaveLength(1);
    expect(one.columns[0].new).toMatchObject({
      name: "id",
      type: "bigint",
      constraint: { primaryKey: true },
    });
    const two = addColumn(one, { idType: "bigint", textType: "varchar" });
    expect(two.columns[1].new).toMatchObject({ name: "column", type: "varchar" });
    expect(two.columns[1].new!.constraint).toEqual({});
  });

  test("reorderColumn moves an added column but refuses to land on an existing one", () => {
    let c = addColumn(baseChange(), { idType: "integer", textType: "text" });
    const addedKey = c.columns.at(-1)!.key;
    const idKey = keyOf(c, "id");
    // moving the added column onto the persisted id column's slot is refused
    const refused = reorderColumn(c, addedKey, idKey);
    expect(refused.columns.at(-1)!.key).toBe(addedKey);

    // add a second new column, then reorder among the two added ones
    c = addColumn(c, { idType: "integer", textType: "text" });
    const secondAdded = c.columns.at(-1)!.key;
    const moved = reorderColumn(c, secondAdded, addedKey);
    const keys = moved.columns.map((x) => x.key);
    expect(keys.indexOf(secondAdded)).toBeLessThan(keys.indexOf(addedKey));
  });

  test("addConstraint appends an added (old:null) constraint", () => {
    const c = addConstraint(baseChange(), { primaryKey: true, primaryColumns: ["id"] });
    expect(c.constraints).toHaveLength(1);
    expect(c.constraints[0].old).toBeNull();
    expect(c.constraints[0].new).toMatchObject({ primaryKey: true });
  });

  test("changeConstraint updates the matching constraint by id", () => {
    let c = addConstraint(baseChange(), { unique: true, uniqueColumns: ["email"] });
    const id = c.constraints[0].id;
    c = changeConstraint(c, id, { unique: true, uniqueColumns: ["email", "id"] });
    expect(c.constraints[0].new!.uniqueColumns).toEqual(["email", "id"]);
  });

  test("removeConstraint filters an added one but marks an existing one dropped", () => {
    // added → filtered out
    let c = addConstraint(baseChange(), { unique: true });
    const addedId = c.constraints[0].id;
    c = removeConstraint(c, addedId);
    expect(c.constraints).toHaveLength(0);

    // existing → new set to null (a DROP)
    const withExisting: DatabaseTableSchemaChange = {
      ...baseChange(),
      constraints: [
        { id: "k1", old: { primaryKey: true }, new: { primaryKey: true } },
      ],
    };
    const dropped = removeConstraint(withExisting, "k1");
    expect(dropped.constraints[0].new).toBeNull();
    expect(dropped.constraints[0].old).not.toBeNull();
  });

  test("renameTable and setSchemaName touch only their field", () => {
    const c = setSchemaName(renameTable(baseChange(), "accounts"), "auth");
    expect(c.name).toEqual({ old: "users", new: "accounts" });
    expect(c.schemaName).toBe("auth");
  });

  test("discardChanges resets edits: added columns dropped, existing reset, name restored", () => {
    let c = baseChange();
    c = renameTable(c, "accounts");
    c = changeColumn(c, keyOf(c, "email"), { name: "email_address" });
    c = addColumn(c, { idType: "integer", textType: "text" });
    const discarded = discardChanges(c);
    expect(discarded.name.new).toBe("users");
    expect(discarded.columns).toHaveLength(2); // added one dropped
    expect(discarded.columns.every((x) => x.old && x.new)).toBe(true);
    expect(discarded.columns.find((x) => x.old?.name === "email")!.new!.name).toBe(
      "email"
    );
  });
});
