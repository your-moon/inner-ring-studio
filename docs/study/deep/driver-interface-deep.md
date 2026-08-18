# Database Driver Interface Extraction

## Executive Summary

Two mature web DB tools (Beekeeper Studio and Outerbase) define SQL driver contracts through abstract base classes. This document extracts exact method signatures and identifies patterns for designing a Postgres-first driver interface.

---

## 1. Beekeeper's IBasicDatabaseClient Interface

**File:** `/Users/munkherdene/my/pmsql/docs/study/clones/beekeeper/apps/studio/src/lib/db/types.ts:321`

### Abstract vs. Concrete Method Classification

In `BasicDatabaseClient.ts`, the abstract class implements **concrete defaults** for several methods and declares **abstract** methods per engine. Key patterns:

**Abstract (must implement per engine, BasicDatabaseClient.ts:107–311):**
```typescript
abstract supportedFeatures(): Promise<SupportedFeatures>
abstract versionString(): Promise<string>
abstract listTables(filter?: FilterOptions): Promise<TableOrView[]>
abstract listViews(filter?: FilterOptions): Promise<TableOrView[]>
abstract listRoutines(filter?: FilterOptions): Promise<Routine[]>
abstract listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]>
abstract listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]>
abstract listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]>
abstract listTableIndexes(table: string, schema?: string): Promise<TableIndex[]>
abstract listSchemas(filter?: SchemaFilterOptions): Promise<string[]>
abstract getTableReferences(table: string, schema?: string): Promise<string[]>
abstract getOutgoingKeys(_table: string, _schema?: string): Promise<TableKey[]>
abstract getIncomingKeys(_table: string, _schema?: string): Promise<TableKey[]>
abstract query(queryText: string, tabId: number, options?: any): Promise<CancelableQuery>
abstract executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]>
abstract listDatabases(filter?: DatabaseFilterOptions): Promise<string[]>
abstract getTableProperties(table: string, schema?: string): Promise<TableProperties | null>
abstract getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string>
abstract listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]>
abstract getPrimaryKey(table: string, schema?: string): Promise<string | null>
abstract getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]>
abstract listCharsets(): Promise<string[]>
abstract getDefaultCharset(): Promise<string>
abstract listCollations(charset: string): Promise<string[]>
abstract createDatabase(databaseName: string, charset: string, collation: string): Promise<string>
abstract createDatabaseSQL(): Promise<string>
abstract getTableCreateScript(table: string, schema?: string): Promise<string>
abstract getViewCreateScript(view: string, schema?: string): Promise<string[]>
abstract getRoutineCreateScript(routine: string, type: string, schema?: string, id?: string): Promise<string[]>
abstract executeApplyChanges(changes: TableChanges, tabId?: number): Promise<TableUpdateResult[]>
abstract setTableDescription(table: string, description: string, schema?: string): Promise<string>
abstract setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string>
abstract dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>
abstract truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string>
abstract truncateAllTables(schema?: string): Promise<void>
abstract getTableLength(table?: string, schema?: string): Promise<number>
abstract selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>
abstract selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string>
abstract selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults>
abstract queryStream(query: string, chunkSize: number): Promise<StreamResults>
abstract getBuilder(table: string, schema?: string): ChangeBuilderBase | Promise<ChangeBuilderBase>
```

**Concrete with defaults (BasicDatabaseClient.ts:110–436):**
```typescript
async defaultSchema(): Promise<string | null> // returns null
async getCompletions(_cmd: string): Promise<string[]> // returns []
async getShellPrompt(): Promise<string> // returns ''
async connect(_signal?: AbortSignal): Promise<void> // base tunnel logic
async disconnect(): Promise<void> // closes tunnel, knex
async getTableKeys(table: string, schema?: string): Promise<TableKey[]> // aliases getOutgoingKeys
async listTablePartitions(_table: string, _schema?: string): Promise<TablePartition[]> // returns []
async executeCommand(_commandText: string): Promise<NgQueryResult[]> // returns []
async getResultEditData(queryText: string, fields: FieldDescriptor[]): Promise<FieldEditData[]> // maps columns
async getMaterializedViewCreateScript(_view: string, _schema?: string): Promise<string[]> // returns []
async createTable(_table: CreateTableSpec): Promise<void> // no-op (Mongo only)
async getCollectionValidation(_collection: string): Promise<any> // returns null
async setCollectionValidation(_params: any): Promise<void> // no-op
async getServerStatistics(): Promise<ServerStatistics | null> // returns null
async alterTableSql(change: AlterTableSpec): Promise<string> // uses ChangeBuilder
async alterTable(change: AlterTableSpec): Promise<void> // calls alterTableSql + executeQuery
async alterIndexSql(changes: IndexAlterations): Promise<string | null>
async alterIndex(changes: IndexAlterations): Promise<void>
async alterRelationSql(changes: RelationAlterations): Promise<string | null>
async alterRelation(changes: RelationAlterations): Promise<void>
async alterPartitionSql(_changes: AlterPartitionsSpec): Promise<string | null> // returns ''
async alterPartition(_changes: AlterPartitionsSpec): Promise<void> // no-op
async applyChangesSql(changes: TableChanges): Promise<string>
async applyChanges(changes: TableChanges, tabId?: number): Promise<TableUpdateResult[]>
async setElementName(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>
async truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>
async importStepZero(_table: TableOrView, _options?: any): Promise<any> // returns null
async importBeginCommand(table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
async importTruncateCommand(table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
async importLineReadCommand(table: TableOrView, sqlString: string|string[], importOptions?: ImportFuncOptions): Promise<any>
async importCommitCommand(table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
async importRollbackCommand(table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
async importFinalCommand(table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
async duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void>
async duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string>
async getInsertQuery(tableInsert: TableInsert, runAsUpsert?: boolean): Promise<string>
async syncDatabase(): Promise<void>
async getQueryForFilter(filter: TableFilter): Promise<string>
async getFilteredDataCount(table: string, schema: string | null, filter: string): Promise<string>
```

---

## 2. Outerbase's BaseDriver Abstract Class

**File:** `/Users/munkherdene/my/pmsql/docs/study/clones/outerbase/src/drivers/base-driver.ts:290`

**All methods are abstract:**
```typescript
abstract getFlags(): DriverFlags
abstract getCurrentSchema(): Promise<string | null>
abstract columnTypeSelector: ColumnTypeSelector // abstract property
abstract getCollationList(): string[]
abstract escapeId(id: string): string
abstract escapeValue(value: unknown): string
abstract close(): void
abstract query(stmt: string): Promise<DatabaseResultSet>
abstract batch(stmts: string[]): Promise<DatabaseResultSet[]>
abstract transaction(stmts: string[]): Promise<DatabaseResultSet[]>
abstract schemas(): Promise<DatabaseSchemas>
abstract tableSchema(schemaName: string, tableName: string): Promise<DatabaseTableSchema>
abstract inferTypeFromHeader(header?: DatabaseTableColumn): ColumnType | undefined
abstract trigger(schemaName: string, name: string): Promise<DatabaseTriggerSchema>
abstract findFirst(schemaName: string, tableName: string, key: Record<string, DatabaseValue>): Promise<DatabaseResultSet>
abstract selectTable(schemaName: string, tableName: string, options: SelectFromTableOptions): Promise<{ data: DatabaseResultSet; schema: DatabaseTableSchema }>
abstract updateTableData(schemaName: string, tableName: string, ops: DatabaseTableOperation[], validateSchema?: DatabaseTableSchema): Promise<DatabaseTableOperationReslt[]>
abstract dropTable(schemaName: string, tableName: string): Promise<void>
abstract emptyTable(schemaName: string, tableName: string): Promise<void>
abstract createUpdateTableSchema(change: DatabaseTableSchemaChange): string[]
abstract createUpdateDatabaseSchema(change: DatabaseSchemaChange): string[]
abstract createTrigger(trigger: DatabaseTriggerSchema): string
abstract dropTrigger(schemaName: string, name: string): string
abstract createView(view: DatabaseViewSchema): string
abstract dropView(schemaName: string, name: string): string
abstract view(schemaName: string, name: string): Promise<DatabaseViewSchema>
```

### DriverFlags Capability Fields
```typescript
interface DriverFlags {
  defaultSchema: string
  optionalSchema: boolean
  supportBigInt: boolean
  supportCreateUpdateTable: boolean
  supportModifyColumn: boolean
  dialect: SupportedDialect // "sqlite" | "mysql" | "postgres" | "dolt"
  supportUseStatement?: boolean
  supportInsertReturning: boolean
  supportUpdateReturning: boolean
  supportRowId: boolean
  supportCreateUpdateDatabase: boolean
  supportCreateUpdateTrigger: boolean
}
```

---

## 3. SQL/Exec Pairing Pattern (Beekeeper)

Beekeeper uses a consistent pattern: `*Sql()` methods generate SQL; corresponding non-suffixed methods execute it.

**Concrete example (types.ts:375–376, BasicDatabaseClient.ts:399–409):**
```typescript
async applyChangesSql(changes: TableChanges): Promise<string>
async applyChanges(changes: TableChanges, tabId?: number): Promise<TableUpdateResult[]>
```

**Impl (BasicDatabaseClient.ts:399–409):**
```typescript
async applyChangesSql(changes: TableChanges): Promise<string> {
  await this.deserializeTableChanges(changes);
  return applyChangesSql(changes, this.knex);  // calls shared utility
}

async applyChanges(changes: TableChanges, tabId?: number): Promise<TableUpdateResult[]> {
  await this.deserializeTableChanges(changes);
  return await this.executeApplyChanges(changes, tabId);  // abstract per-engine execution
}
```

**Related types (models.ts:175–213):**
```typescript
interface TableChanges {
  inserts: TableInsert[]
  updates: TableUpdate[]
  deletes: TableDelete[]
}

interface TableInsert {
  table: string
  schema?: string
  dataset?: string
  data: Record<string, any>[]
}

interface PKSelector {
  column: string
  value: any
}

interface TableUpdate {
  table: string
  column: string
  primaryKeys: PKSelector[]
  schema?: string
  dataset?: string
  columnType?: string
  columnObject?: ExtendedTableColumn
  value: any
}

interface TableDelete {
  table: string
  primaryKeys: PKSelector[]
  schema?: string
  dataset?: string
}
```

---

## 4. Minimum Method Set for Postgres-First Driver

Combining both interfaces, a Postgres driver must implement:

**Connection & Config (required by both):**
- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `getFlags(): DriverFlags` → includes dialect, schema behavior, returning support

**Introspection (schema discovery):**
- `listSchemas(filter?: SchemaFilterOptions): Promise<string[]>`
- `listTables(filter?: FilterOptions): Promise<TableOrView[]>`
- `listTableColumns(table: string, schema?: string): Promise<ExtendedTableColumn[]>`
- `getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]>`

**Row Access (fetch with filter/sort):**
- `selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>`
- `selectTopSql(...): Promise<string>`

**Data Modification (insert/update/delete):**
- `applyChangesSql(changes: TableChanges): Promise<string>`
- `applyChanges(changes: TableChanges, tabId?: number): Promise<TableUpdateResult[]>`

**Raw SQL (query execution):**
- `executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]>`

**Escaping (identifier & value safety):**
- `escapeId(id: string): string` (Outerbase, required for generated SQL)
- `escapeValue(value: unknown): string` (Outerbase)

This 11-method set covers connect, list-schema, list-tables, list-columns, list-PKs, row-select, row-select-SQL, insert/update/delete, raw-query, escape-id, escape-value.

