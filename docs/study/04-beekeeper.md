# Beekeeper Studio — Driver Layer, Write-Back & Credential Security

Clone: `/Users/munkherdene/my/pmsql/docs/study/clones/beekeeper` (Electron + Vue2 + TS monorepo, `apps/studio`).

## 1. Structure & Organization

Every driver lives under `apps/studio/src/lib/db/`. Key layout:

- `lib/db/clients/` — one file per engine: `postgresql.ts` (67 KB), `mysql.ts`, `sqlite.ts`, `sqlserver.ts`, `redshift.ts`, `cockroach.ts`, plus `BasicDatabaseClient.ts` (the abstract base). Commercial/NoSQL drivers (mongodb, dynamodb, duckdb, surrealdb, libsql) live parallel in `src-commercial/backend/lib/db/clients/`.
- `lib/db/types.ts` — the driver interface `IBasicDatabaseClient` plus all connection/SSH/SSL config shapes.
- `lib/db/models.ts` — the shared data DTOs (`TableChanges`, `TableUpdate`, `PrimaryKeyColumn`, `NgQueryResult`, `TableResult`…).
- `lib/db/clients/utils.ts` — dialect-neutral SQL builders (insert/update/delete via Knex, filter strings, escaping).
- `lib/db/clients/index.ts` — the `CLIENTS` registry + `findClient(key)` factory; per-engine capability flags via `disabledFeatures`.
- `lib/db/tunnel.ts` — SSH tunnel setup. `shared/lib/dialects/` and `shared/lib/sql/change_builder/` — per-dialect identifier quoting + DDL builders.
- App-side credential store: `common/appdb/models/saved_connection.ts` (+ `transformers/Transformers.ts`, `common/encryption_key.ts`).

**Dependency direction:** concrete clients depend *inward* on `BasicDatabaseClient` (abstract) → which implements `IBasicDatabaseClient` (interface in `types.ts`) and consumes DTOs from `models.ts`. Dialect quoting and DDL builders are injected via an abstract `getBuilder()` returning a `ChangeBuilderBase`. The renderer never imports a client directly — it talks to a handler layer; drivers run in the Electron utility process.

## 2. Architecture — the core abstraction

`abstract class BasicDatabaseClient<RawResultType extends BaseQueryResult, Conn = null> implements IBasicDatabaseClient` (`clients/BasicDatabaseClient.ts:71`). It is generic over the raw driver result and the reserved-connection type. Base holds `knex`, `dialect`, `readOnlyMode`, `server`, `database`, `reservedConnections: Map`, and `transcoders` (value (de)serialization). Concrete drivers implement a *small* set of abstract methods and inherit dozens of concrete ones; the two protected hooks that matter most are `abstract rawExecuteQuery(q, options)` (line 564) and `abstract getBuilder(table, schema): ChangeBuilderBase` (line 104).

**Generic query result** (`BasicDatabaseClient.ts:64`):
```ts
interface BaseQueryResult { columns: {name, type?}[]; rows: any[][] | Record<string,any>[]; arrayMode: boolean }
```
The user-facing result is `NgQueryResult` (`models.ts:297`): `{ fields: FieldDescriptor[]; rows; rowCount; affectedRows; command; truncated }`, wrapped in a `CancelableQuery { execute(); cancel() }` so long queries can be aborted.

## 3. THE HARD PARTS

### (a) The driver interface — `IBasicDatabaseClient` (`lib/db/types.ts:321`) — CROWN JEWEL

Verbatim method list (every driver must satisfy):

```
supportedFeatures(): Promise<SupportedFeatures>
versionString(): Promise<string>
defaultSchema(): Promise<string | null>
listCharsets(): Promise<string[]>
getDefaultCharset(): Promise<string>
listCollations(charset): Promise<string[]>
getCompletions(cmd): Promise<string[]>
getShellPrompt(): Promise<string>
connect(): Promise<void>
disconnect(): Promise<void>
listTables(filter?): Promise<TableOrView[]>
listViews(filter?): Promise<TableOrView[]>
listRoutines(filter?): Promise<Routine[]>
listMaterializedViewColumns(table, schema?): Promise<TableColumn[]>
listTableColumns(table, schema?): Promise<ExtendedTableColumn[]>
listTableTriggers(table, schema?): Promise<TableTrigger[]>
listTableIndexes(table, schema?): Promise<TableIndex[]>
listSchemas(filter?): Promise<string[]>
getTableReferences(table, schema?): Promise<string[]>
getTableKeys(table, schema?): Promise<TableKey[]>
listTablePartitions(table, schema?): Promise<TablePartition[]>
executeCommand(commandText): Promise<NgQueryResult[]>
query(queryText, tabId, options?): Promise<CancelableQuery>
getResultEditData(queryText, fields): Promise<FieldEditData[]>
executeQuery(queryText, options?): Promise<NgQueryResult[]>
listDatabases(filter?): Promise<string[]>
getTableProperties(table, schema?): Promise<TableProperties | null>
getQuerySelectTop(table, limit, schema?): Promise<string>
listMaterializedViews(filter?): Promise<TableOrView[]>
getPrimaryKey(table, schema?): Promise<string | null>
getPrimaryKeys(table, schema?): Promise<PrimaryKeyColumn[]>
createDatabase(name, charset, collation): Promise<string>
createDatabaseSQL(): Promise<string>
getTableCreateScript(table, schema?): Promise<string>
getViewCreateScript(view, schema?): Promise<string[]>
getMaterializedViewCreateScript(view, schema?): Promise<string[]>
getRoutineCreateScript(routine, type, schema?, id?): Promise<string[]>
createTable(table): Promise<void>
getCollectionValidation(collection) / setCollectionValidation(params)   // NoSQL
alterTableSql(change) / alterTable(change)
alterIndexSql(changes) / alterIndex(changes)
alterRelationSql(changes) / alterRelation(changes)
alterPartitionSql(changes) / alterPartition(changes)
applyChangesSql(changes): Promise<string>
applyChanges(changes, tabId?): Promise<TableUpdateResult[]>
setTableDescription(table, description, schema?): Promise<string>
setElementName(...) / dropElement(...) / truncateElement(...) / truncateAllTables(schema?)
getTableLength(table?, schema?): Promise<number>
selectTop(table, offset, limit, orderBy, filters, schema?, selects?): Promise<TableResult>
selectTopSql(...): Promise<string>
selectTopStream(...): Promise<StreamResults>
queryStream(query, chunkSize): Promise<StreamResults>
duplicateTable(...) / duplicateTableSql(...)
getInsertQuery(tableInsert, runAsUpsert?): Promise<string>
syncDatabase(): Promise<void>
getServerStatistics(): Promise<ServerStatistics | null>
importStepZero / importBeginCommand / importTruncateCommand / importLineReadCommand /
  importCommitCommand / importRollbackCommand / importFinalCommand    // bulk import lifecycle
getQueryForFilter(filter): Promise<string>
getFilteredDataCount(table, schema, filter): Promise<string>
```

Note the recurring **`xxxSql()` + `xxx()` pairing** (`applyChangesSql`/`applyChanges`, `selectTopSql`/`selectTop`, `alterTableSql`/`alterTable`): every mutation can be *previewed as SQL* before execution — a great UX + safety pattern to steal for a "review changes" dialog.

### (b) Safe write-back / "apply changes"

The grid emits a `TableChanges { inserts: TableInsert[]; updates: TableUpdate[]; deletes: TableDelete[] }` (`models.ts:175`). Critically, **updates and deletes carry their own PK selectors**: `TableUpdate { table, column, value, primaryKeys: PKSelector[], columnObject }` and `TableDelete { table, primaryKeys: PKSelector[] }` where `PKSelector = { column, value }` — the WHERE clause is built from the row's actual PK values, never from row offset.

Base `applyChanges` (`BasicDatabaseClient.ts:404`) deserializes values then delegates to the driver's `executeApplyChanges`. Postgres (`postgresql.ts:881`) wraps insert→update→delete in a single transaction (`runWithTransaction`), or reuses a pinned tab connection for open manual transactions. Each row type is normalized (`normalizeValue` per column type) then turned into SQL by the **shared, Knex-backed** builders in `utils.ts`:
- `buildInsertQueries` (`utils.ts:281`) — Knex `.insert()`, with optional `.onConflict(primaryKeys).merge()` upsert (`utils.ts:265`).
- `buildUpdateQueries` (`utils.ts:286`) — `knex(table).withSchema().where(pkMap).update(blob)`.
- `buildDeleteQueries` (`utils.ts:357`) — `.where(pkMap).delete()`.
- After update, `buildSelectQueriesFromUpdates` re-SELECTs the row so the grid shows DB-computed values.

Using **Knex `.toQuery()`** means values are bound/escaped by the query builder, not string-concatenated. A notable hack (`utils.ts:248`, `#1734`): literal `?` in a column name is escaped because Knex treats `?` as a bind placeholder.

**Identifier escaping is per-dialect.** Each driver has its own `wrapIdentifier` — Postgres (`postgresql.ts:1197`) does `"` → `""` doubling and preserves array subscripts `[0]`; the dialect module (`shared/lib/dialects/postgresql.ts:36`) repeats the rule; `utils.ts` provides `ansiWrapIdentifier` (double-quote) and `defaultWrapIdentifier` (backtick) as injectable defaults. `escapeString` (`utils.ts:29`) doubles single quotes for literals. DDL (rename/comment/alter) goes through `ChangeBuilderBase` subclasses (`shared/lib/sql/change_builder/PostgresqlChangeBuilder.ts` etc.), one per dialect.

### (c) Connection + credential security

- **Encrypted at rest via TypeORM transformers.** `saved_connection.ts:166` marks `password` `@Column({ transformer: [encrypt] })` using `EncryptTransformer` (`transformers/Transformers.ts:11`), which wraps `simple-encryptor`. SSH passwords/passphrases, Azure `clientSecret`/`tenantId` (`AzureCredsEncryptTransformer`), Surreal tokens, and token caches use the same pattern. Snowflake `passcode` is *stripped before save* (`transformers/Transformers.ts:59`) since it rotates.
- **Per-install key.** `common/encryption_key.ts:loadEncryptionKey()` generates a random 32-byte key on first run, stores it in `~/.../.key` encrypted under a hard-coded bootstrap key. So the DB file alone is not enough to read passwords.
- **SSH tunneling** (`tunnel.ts`): builds an `SSHConnection` (frps-style local forward), resolves the private key ssh(1)-style — tries `IdentityFile` entries in order, skips unreadable ones (never aborts, `#4366`), falls back to `id_ed25519/ecdsa/rsa/dsa`. Supports agent forwarding with an **identities-only filtering agent** (`identitiesOnlyAgent.ts`), bastion hops, and an `authHandler` that always includes `'none'` as a fallback. Local port picked via `portfinder`.
- **SSL** carried on `IDbConnectionServerConfig` (`types.ts:273`): `sslCaFile/sslCertFile/sslKeyFile`, `sslRejectUnauthorized`, plus SQL-Server-specific `encryptionMode: 'off'|'on'|'strict'` with optional pinned `serverCertificate`.
- **Read-only mode** guard: `violatesReadOnly()` (`BasicDatabaseClient.ts:645`) parses statements with `sql-query-identifier` and only allows `LISTING`/`INFORMATION` types when read-only (`utils.ts:376`).

## 4. Clean Code

- **Per-dialect specialization vs shared base:** thin abstract surface (`getBuilder`, `rawExecuteQuery`, `versionString`, `supportedFeatures`) + fat inherited behavior. Cross-cutting SQL generation is shared in `utils.ts` and `change_builder/`, so a new driver overrides only what differs.
- **Capability flags** (`SupportedFeatures` in `models.ts:246` + `disabledFeatures` in `clients/index.ts`) let the UI gray out unsupported features instead of drivers throwing.
- **Error handling:** typed `ClientError` with a `helpLink` (`utils.ts:21`); centralized `errorMessages`; logging via scoped `@bksLogger`.
- **Testing:** mirror structure under `tests/integration/lib/db/clients/` and `tests/unit/lib/db/clients/`; integration tests run real DBs (Testcontainers-style), giving one behavioral spec exercised across every dialect.

## TOP 5 PATTERNS TO STEAL

1. **The `IBasicDatabaseClient` interface itself** — `lib/db/types.ts:321`. Copy the method list as your driver contract; for v1 Postgres you implement ~40 methods, MySQL/SQLite slot in behind the same interface.
2. **`xxxSql()` / `xxx()` method pairing** — `types.ts:375` (`applyChangesSql`/`applyChanges`). Free "preview the SQL before running it" for a safe edit-review dialog.
3. **PK-carrying `TableChanges` DTO + Knex builders** — `models.ts:175` + `clients/utils.ts:281-374`. Edits carry their own `primaryKeys: PKSelector[]`; WHERE is built from PK values via `knex().where().update()`, bound not concatenated.
4. **Encrypted credential store via ORM transformers + per-install key** — `common/appdb/transformers/Transformers.ts:11` + `common/encryption_key.ts`. Declaratively encrypt `password` at the column level; key never travels with the data file.
5. **Injected per-dialect `wrapIdentifier` / `ChangeBuilderBase`** — `postgresql.ts:1197`, `shared/lib/sql/change_builder/`. Keep identifier quoting and DDL generation in one swappable place per dialect so the shared write-back path stays dialect-agnostic.
