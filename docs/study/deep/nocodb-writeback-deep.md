# NocoDB Write-Back: Row ID Resolution & SQL Injection Defense

## 1. Primary Key Identification Algorithm

**Composite PK Serialization** (`dbHelpers.ts:87–184`)

The `_wherePk(primaryKeys: Column[], id: unknown | unknown[], skipPkValidation?)` function extracts PK values and builds a Knex `where` clause:

- **Object ID input** (`dbHelpers.ts:95–119`): If `id` is an object, verify all PK columns exist by checking `pk.id`, `pk.title`, or `pk.column_name` in order, then map to `where[pk.column_name]`.
- **Composite string ID** (`dbHelpers.ts:121–129`): If `id` is a string with multiple PKs, split on `'___'` and unescape `\_` → `_` per `splitCompositePkString()` (`dbHelpers.ts:190–192`).
- **Type coercion**:
  - **Bytea** (`dbHelpers.ts:138–149`): Return a closure calling `qb.whereRaw("?? = decode(?, '...')", [column_name, ids[i]])` — literal `'hex'` or `'escape'` format string baked into SQL. **Injection risk:** format is from metadata, not user input.
  - **Numeric/ID columns** (`dbHelpers.ts:150–162`): Validate via `ncIsNumber()`, then bind normally. Reject non-numeric unless `skipPkValidation=true`.
  - **UUID/binary(16)** (`dbHelpers.ts:166–182`): Detect 36- or 32-char hex UUID, reformat to standard dashes, convert to `Buffer.from(uuid, 'hex')`. Bind as Buffer.

**Extraction (from row data)** (`dbHelpers.ts:1122–1159`)

`dataWrapper(data).extractPksValue(model, asString?)` retrieves PK values:
- **Composite keys**: Extract `data[pk.title] ?? data[pk.column_name] ?? data[pk.id]` for each PK. If `asString=true`, escape underscores (`'_'` → `'\_'`) and join on `'___'`.
- **Single key**: Return scalar value or stringified scalar.

## 2. Update Flow: Column Mapping & SQL Generation

**Alias-to-Column Mapping** (`Model.ts:876–896`)

`mapAliasToColumn(context, data, clientMeta, knex, columns?)` normalizes UI input to DB schema:

```typescript
const insertObj = {};
for (const col of columns) {
  if (isVirtualCol(col)) continue;
  let val = dbDataWrapper.getByColumnNameTitleOrId(col);  // try: column_name, title, id
  if (val !== undefined) {
    // type conversions: Attachment → JSON.stringify, DateTime ± timezone offset per dialect
    insertObj[col.column_name] = val;
  }
}
```

Maps UI names → `col.column_name` (DB name). Skips virtual/computed columns.

**Validation Rejects Auto/Readonly Columns** (`BaseModelSqlv2.ts:6054–6093`)

`validate(data, columns, { typecast?, allowSystemColumn? })` enforces:
- **CreatedTime/LastModifiedTime/LastModifiedBy columns** → throw `"is auto generated and cannot be updated"` (`line 6055–6060`).
- **System columns** (except Order, ForeignKey, SelfLink) → throw `"is system column and cannot be updated"` (`line 6063–6086`).
- **Readonly columns** → throw `"is readonly column and cannot be updated"` (`line 6089–6092`).

**SQL Update Execution** (`BaseModelSqlv2.ts:2798–2816`)

```typescript
const wherePkClause = await this._wherePk(id, true);
const updateObjForDriver = this.isMssql
  ? Object.fromEntries(Object.entries(updateObj).filter(([k]) => !(k in wherePkClause)))
  : updateObj;  // drop PK keys from payload on mssql (IDENTITY column restriction)

const query = this.dbDriver(this.tnPath).update(updateObjForDriver).where(wherePkClause);
await this.execAndParse(query, null, { raw: true });
```

Builds Knex UPDATE: `.update({ column_name: value })` with parameterized bindings, then `.where()` with _wherePk clause.

## 3. SQL Injection Defense: Quoting & Parameterization

**Identifier vs Literal Binding** (`sqlSanitize.ts`)

- **Identifiers** (table, column names): Knex `??` placeholder → `"column_name"` (pg) or `` `column_name` `` (mysql). Validated via schema.
- **Values**: Knex `?` placeholder → `$1`, `$2`, … (pg) or `?` (mysql) with separate parameter array. **Never interpolated**.

**DDL Value Literals** (`sqlSanitize.ts:25–30`)

`pgQuoteLiteral(value: string)` wraps literals for DDL (e.g., `ALTER COLUMN SET DEFAULT`):

```typescript
export function pgQuoteLiteral(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}
```

Doubles single quotes (`'` → `''`), wraps in quotes. **Used only where Knex bindings cannot go** (PG DDL parser rejects `$N` for value literals).

**Data Type Precision Allowlist** (`sqlSanitize.ts:51–70`)

`sanitiseDataTypePrecision(dtxp: string | number | null | undefined)` validates `dtxp` (precision/length in DDL):

```typescript
/^\d+(?:\s*,\s*\d+)?$/.test(value)    // e.g., `255` or `10,2`
/^max$/i.test(value)                   // SQL Server `MAX` keyword
/^'(?:[^']|'')*'(?:\s*,\s*'(?:[^']|'')*')*$/.test(value)  // enum list: `'a','b'`
```

Throws on injection patterns like `1) CHECK(1=0`.

**Placeholder Escape** (`sqlSanitize.ts:3–12`)

`sanitize(v)` escapes `?` → `\?` in strings (reverse: `unsanitize`). Prevents user `?` from being mistaken for Knex placeholders when used in raw queries.

---

**Summary**: NocoDB uses parameterized queries (Knex) as default, reserving `pgQuoteLiteral` and regex allowlists only for non-bindable DDL positions. PK extraction handles composite keys and type coercion (bytea/UUID/numeric) at the WHERE clause level, and validate() blocks system/readonly columns pre-execution.
