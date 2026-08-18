# NocoDB — Study Notes (Airtable UX over users' own MySQL/Postgres/SQLite)

Clone: `packages/nocodb` (NestJS/TS backend) + `packages/nc-gui` (Nuxt/Vue3 frontend). All paths below are under `docs/study/clones/nocodb/`.

## 1. Structure & organization

pnpm + Lerna monorepo (`pnpm-workspace.yaml`, `lerna.json`). Key packages: `nocodb` (backend), `nc-gui` (frontend), `nocodb-sdk` (shared types + generated `Api` client used by the grid), `noco-integrations` (pluggable data-source connectors). Backend layout under `packages/nocodb/src`:

- **DB / driver layer:** `db/sql-client/lib/` — `SqlClientFactory.ts` dispatches on `client` (`pg`→`PgClient`, `mysql/mysql2`→`MySqlClient`, `sqlite3`→`SqliteClient`, plus Tidb/Vitess/Yugabyte subclasses over `KnexClient.ts`). This is the DDL/introspection client (schema ops), distinct from the *data* path.
- **Data path / query builder:** `db/BaseModelSqlv2.ts` (10k+ lines) — the ORM-ish model that turns a NocoDB "Model" (a real external table) into safe Knex CRUD. `db/CustomKnex.ts` (`XKnex`) wraps Knex with NocoDB condition/CTE extensions.
- **Connection manager:** `utils/common/NcConnectionMgrv2.ts` — LRU cache of live Knex pools keyed per source.
- **Metadata layer:** `models/*.ts` — `Source`, `Base`, `Model`, `Column`, `GridView`, `Filter`, `Sort`, `View` — persisted in the app's own meta DB (`nc_*_v2` tables, `utils/globals.ts:MetaTable`). Views/filters/sorts/column-config live here, never in the user's DB.

Dependency direction: `controllers/` → `services/` (e.g. `services/datas.service.ts`) → `Model.getBaseModelSQL()` → `BaseModelSqlv2` → `NcConnectionMgrv2.get(source)` → Knex. Metadata models are read to *build* queries against the external DB; the two DBs never mix.

## 2. Architecture

A **Source** (`models/Source.ts`) models a connection to one external DB; a **Base** groups sources; a **Model** is one external table; **Columns** carry a NocoDB UI-type (`uidt`) over the raw `dt`. Introspection is raw dialect SQL against `information_schema` — see `PgClient.columnList()` (`db/sql-client/lib/pg/PgClient.ts:812`): it pulls `data_type`, precision/scale, nullability, defaults, `is_identity`, PK constraint name/ordinal, `is_unique`, and enum labels from `pg_enum`, then maps to `uidt`. Query building is **Knex** throughout (`db/CustomKnex.ts` imports `knex`). The metadata DB relates to the external DB purely by reference: `Model.table_name` + `Source` connection config; `getTnPath()` (`BaseModelSqlv2.ts:2867`) schema-qualifies for pg/mssql. `dataUpdate` (`services/datas.service.ts:179`) shows the whole join: resolve Model+Source → `NcConnectionMgrv2.get(source)` → `getBaseModelSQL` → `updateByPk`.

## 3. THE THREE HARD PARTS

### (a) Editable virtualized grid — custom HTML5 **canvas** grid
Not ag-grid/DOM rows. A single `<canvas>` (`nc-gui/components/smartsheet/grid/canvas/index.vue:3663`) with manual hit-testing; render loop `useCanvasRender.ts:renderCanvas()` gets a DPR-scaled 2D context (`canvas/utils/safeCanvas.ts:6`) and draws every cell imperatively (one file per column type under `canvas/cells/*.ts`). Virtualization is two-layered: a custom `Scroller.vue` keeps the canvas `sticky` over a full-height spacer; visible rows are computed by arithmetic — `startRowIndex = Math.floor(scrollTop / rowHeight)` (`useCanvasRender.ts:2382`). Data windowing is a 50-row chunk cache: `useInfiniteData.ts` (`CHUNK_SIZE = 50`, line 388) keeps a `cachedRows` Map, marks `chunkStates` loading/loaded, and fetches on demand via `$api.dbViewRow.list(...)` (line 856) — infinite scroll, not classic pagination.

### (b) Safe write-back — the strongest part to steal
Cell edit → `updateOrSaveRow` → `updateRowProperty` (`useInfiniteData.ts:1683/1561`), optimistic local mutation + `rowMeta.saving`, then `$api.dbViewRow.update(...,{ [property]: val }, { typecast:'true' })`. Server: `updateByPk` (`BaseModelSqlv2.ts:2741`) — (1) `mapAliasToColumn` maps UI titles → real column names; (2) `validate()` (line 6037) rejects writes to system/readonly/auto columns; (3) reads `prevData` for audit; (4) rejects empty payloads explicitly; (5) builds `dbDriver(tnPath).update(updateObj).where(await this._wherePk(id, true))`. **PK identification** is the crux: `_wherePk` (`helpers/dbHelpers.ts:87`) takes the table's `primaryKeys` (from introspection), supports single/composite (composite id split on `'___'`), per-column type handling (numeric validation, `bytea` via `decode()`, UUID/binary(16)), and rejects incomplete composite ids up-front rather than letting Knex emit `undefined` bindings. **Injection defense** = Knex parameterization everywhere (`.update()`/`.where()` bind values); identifiers pass through `sanitize()` (`helpers/sqlSanitize.ts`) which escapes `?` placeholders, and DDL literals go through `pgQuoteLiteral`/`sanitiseDataTypePrecision` (allowlist regex — the comment documents a real `1) CHECK(1=0` injection it blocks). mssql IDENTITY columns are stripped from the update payload. Type coercion is opt-in via `typecast`.

### (c) Connection + credential security
Credentials live in the meta DB's `nc_sources_v2.config`, **AES-encrypted** when `NC_CONNECTION_ENCRYPT_KEY` is set: `utils/encryptDecrypt.ts` (`CryptoJS.AES.encrypt`), applied in `Source.encryptConfigIfRequired` on insert/update and reversed in `getConnectionConfig()` (`decryptPropIfRequired`). Pooling: `NcConnectionMgrv2` holds an **LRU of live Knex instances** (`CONNECTION_CACHE_MAX_SIZE=500`, evicted conns `.destroy()`), keyed `base_id:id` (a comment notes bare-id keying once leaked one base's connection to another — real isolation bug fixed). Cross-server invalidation via a Redis version tracker (`resetSource`/`checkSourceStaleness`). External sources get **SSRF protection** (`applyDbSsrfProtection`) that meta connections skip; default pool `{min:0,max:5}`.

## 4. Clean code

Errors: centralized `NcError` factory (`NcError.get(context).recordNotFound/badRequest/invalidPrimaryKey`) with context, giving typed HTTP errors instead of leaking Knex 500s — comments explicitly cite the bad UX being avoided. Tests: NestJS `Test.createTestingModule` unit specs colocated (`*.controller.spec.ts`), plus integration suites against real **Sakila** sample DBs per dialect (`tests/pg-sakila-db`, etc.). Idioms worth stealing: the `uidt` abstraction (UI type decoupled from SQL type), dialect subclassing over a `KnexClient` base, and the load-bearing explanatory comments that encode past bugs.

## TOP 5 PATTERNS TO STEAL

1. **PK resolver for arbitrary tables** — `helpers/dbHelpers.ts:87` (`_wherePk`): composite keys, per-type coercion, up-front validation of incomplete keys.
2. **Per-source LRU connection pool with correct isolation key** — `utils/common/NcConnectionMgrv2.ts` (key on `base_id:id`, evict→`destroy`, Redis staleness).
3. **Encrypt-at-rest credentials gated by env key** — `utils/encryptDecrypt.ts` + `models/Source.ts:getConnectionConfig`.
4. **Safe write-back pipeline** — `db/BaseModelSqlv2.ts:2741` (`updateByPk`): alias→column map, `validate()` guards, Knex-parameterized update, empty-payload rejection.
5. **Canvas grid + 50-row chunk cache** — `nc-gui/.../canvas/index.vue` + `composables/useInfiniteData.ts` (optimistic `updateRowProperty`, on-demand chunk fetch) for a grid that scales to large tables.
