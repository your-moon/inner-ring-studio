import {
  DatabaseTableColumn,
  DatabaseTableColumnChange,
  DatabaseTableColumnConstraint,
  DatabaseTableSchema,
  DatabaseTableSchemaChange,
} from "@/drivers/base-driver";
import deepEqual from "deep-equal";
import { cloneDeep } from "lodash";
import { generateId } from "../generate-id";

/**
 * The schema-change builder: pure functions that turn a user's edit intent into
 * the next {@link DatabaseTableSchemaChange}. This logic used to live only inside
 * the schema-editor's setState closures — fused to rendering and untestable.
 *
 * Two invariants every function here upholds:
 * - **Immutable**: the input change is never mutated; only touched nodes are
 *   rebuilt. (The old closures shallow-copied the column array and then mutated
 *   the shared column objects — corrupting the `.old` snapshot.)
 * - **Keyed by stable id**: columns by their `key`, constraints by their `id`,
 *   so operations survive reorders and re-renders (the old code keyed columns by
 *   array index and constraints by object identity).
 */

// ---- inspect ----

export function checkSchemaColumnChange(change: DatabaseTableColumnChange) {
  return !deepEqual(change.old, change.new);
}

export function checkSchemaChange(change: DatabaseTableSchemaChange) {
  if (change.name.new !== change.name.old) return true;

  for (const col of change.columns) {
    if (checkSchemaColumnChange(col)) {
      return true;
    }
  }

  return false;
}

// ---- build ----

export function createTableSchemaDraft(
  schemaName: string,
  schema: DatabaseTableSchema
): DatabaseTableSchemaChange {
  return {
    schemaName,
    name: {
      old: schema.tableName,
      new: schema.tableName,
    },
    columns: schema.columns.map((col) => ({
      key: generateId(),
      old: col,
      new: cloneDeep(col),
    })),
    constraints: (schema.constraints ?? []).map((con) => ({
      id: generateId(),
      old: con,
      new: cloneDeep(con),
    })),
    createScript: schema.createScript,
  };
}

// ---- table-level mutations ----

export function renameTable(
  change: DatabaseTableSchemaChange,
  newName: string
): DatabaseTableSchemaChange {
  return { ...change, name: { ...change.name, new: newName } };
}

export function setSchemaName(
  change: DatabaseTableSchemaChange,
  schemaName: string
): DatabaseTableSchemaChange {
  return { ...change, schemaName };
}

// ---- column mutations ----

export function addColumn(
  change: DatabaseTableSchemaChange,
  types: { idType: string; textType: string }
): DatabaseTableSchemaChange {
  // Convention: the first column of a fresh table is an `id` primary key.
  const newColumn: DatabaseTableColumn =
    change.columns.length === 0
      ? { name: "id", type: types.idType, constraint: { primaryKey: true } }
      : { name: "column", type: types.textType, constraint: {} };

  return {
    ...change,
    columns: [
      ...change.columns,
      { key: generateId(), old: null, new: newColumn },
    ],
  };
}

export function changeColumn(
  change: DatabaseTableSchemaChange,
  columnKey: string,
  patch: Partial<DatabaseTableColumn> | null
): DatabaseTableSchemaChange {
  const columns = change.columns.map((col) => {
    if (col.key !== columnKey || !col.new) return col;
    const next: DatabaseTableColumn | null =
      patch === null
        ? null
        : {
            ...col.new,
            ...patch,
            constraint: patch.constraint
              ? { ...col.new.constraint, ...patch.constraint }
              : col.new.constraint,
          };
    return { ...col, new: next };
  });

  // Clearing a freshly-added column (no persisted `old`) removes it entirely;
  // clearing an existing column leaves `new: null`, which is a DROP.
  return {
    ...change,
    columns: columns.filter((col) => !(col.new === null && col.old === null)),
  };
}

export function reorderColumn(
  change: DatabaseTableSchemaChange,
  fromKey: string,
  toKey: string
): DatabaseTableSchemaChange {
  if (fromKey === toKey) return change;
  const from = change.columns.findIndex((c) => c.key === fromKey);
  const to = change.columns.findIndex((c) => c.key === toKey);
  if (from < 0 || to < 0) return change;
  // A persisted column's position is fixed — you can only reorder around it.
  if (change.columns[to].old) return change;

  const columns = [...change.columns];
  const [moved] = columns.splice(from, 1);
  columns.splice(to, 0, moved);
  return { ...change, columns };
}

// ---- constraint mutations ----

export function addConstraint(
  change: DatabaseTableSchemaChange,
  constraint: DatabaseTableColumnConstraint
): DatabaseTableSchemaChange {
  return {
    ...change,
    constraints: [
      ...change.constraints,
      { id: generateId(), old: null, new: constraint },
    ],
  };
}

export function changeConstraint(
  change: DatabaseTableSchemaChange,
  id: string,
  constraint: DatabaseTableColumnConstraint
): DatabaseTableSchemaChange {
  return {
    ...change,
    constraints: change.constraints.map((c) =>
      c.id === id ? { ...c, new: constraint } : c
    ),
  };
}

export function removeConstraint(
  change: DatabaseTableSchemaChange,
  id: string
): DatabaseTableSchemaChange {
  const target = change.constraints.find((c) => c.id === id);
  if (!target) return change;
  // Added constraint → drop it from the list; existing → mark it a DROP.
  if (!target.old) {
    return {
      ...change,
      constraints: change.constraints.filter((c) => c.id !== id),
    };
  }
  return {
    ...change,
    constraints: change.constraints.map((c) =>
      c.id === id ? { ...c, new: null } : c
    ),
  };
}

// ---- discard ----

/** Reset every pending edit back to the persisted `old` state. */
export function discardChanges(
  change: DatabaseTableSchemaChange
): DatabaseTableSchemaChange {
  return {
    ...change,
    name: { ...change.name, new: change.name.old },
    columns: change.columns
      .map((col) => ({ key: col.key, old: col.old, new: cloneDeep(col.old) }))
      .filter((col) => col.old),
    constraints: change.constraints.map((con) => ({
      id: generateId(),
      old: con.old,
      new: cloneDeep(con.old),
    })),
  };
}
