# Directus — Study Notes (introspection-driven CRUD over arbitrary SQL)

All paths relative to `docs/study/clones/directus/`. Directus wraps an *existing* SQL DB into REST/GraphQL by introspection. It's a Node/TS pnpm monorepo. Multi-DB, but Postgres is a first-class dialect — directly relevant to our v1.

## 1. Structure & organization
- Monorepo (`pnpm-workspace.yaml`): `api/` (the server, Express + Knex), `app/` (Vue admin), `sdk/`, and ~35 `packages/*`. Dependency direction is leaf-packages → api. Key packages: `@directus/schema` (their own **fork of knex-schema-inspector**, `packages/schema/`), `@directus/errors` (custom error framework), `@directus/types`, `@directus/utils`, `@directus/env`.
- Introspection lives in **`packages/schema/src/dialects/postgres.ts`** (682 lines) — one class per dialect implementing `SchemaInspector` (`packages/schema/src/types/schema-inspector.ts`). `createInspector(knex)` picks the dialect by `knex.client.constructor.name`.
- The query/CRUD engine is the **`ItemsService`** (`api/src/services/items.ts`, 1278 lines) — the crown jewel — backed by `PayloadService` (`api/src/services/payload.ts`), an AST layer (`api/src/database/get-ast-from-query/`, `api/src/database/run-ast/`), and a permissions module (`api/src/permissions/modules/`).

## 2. Architecture — core abstractions
- **"Collection" = a table row in the in-memory `SchemaOverview`.** `postgres.overview()` runs two raw queries against `information_schema.columns` (filtered to `table_type='BASE TABLE'`, so views are excluded) and `pg_index`/`pg_class` for single-column primary keys, then builds `{ collections: { [table]: { primary, fields: {...} } } }`. This snapshot is loaded once and frozen (`api/src/utils/freeze-schema.ts`); every service takes it as `options.schema` and never re-introspects per request.
- **ItemsService is the uniform CRUD facade**, generic over `<Item, Collection>`. Its constructor (items.ts:51) just captures `collection`, `knex`, `accountability`, `schema`. Every system table (`directus_users`, …) is *also* just an ItemsService with a different collection name — no special-casing of user tables vs. arbitrary tables.
- **Reads go through an AST, not string SQL.** `readByQuery` (items.ts:509) → `getAstFromQuery` → `processAst` (permissions inject filter cases) → `runAst` builds the Knex SELECT. This separates "what to fetch" from "how to fetch it," which is where field/relation resolution and permission CASE-injection happen.
- **Relations are inferred from foreign keys** by the inspector (`foreignKeys()` reads `pg_constraint`/`information_schema`), materialized into a relations list; `getRelationsForCollection` (`@directus/utils`) drives M2O/O2M/A2O nested handling in PayloadService (`processM2O`/`processO2M`/`processA2O`).
- **Knex is the single abstraction over dialects.** Never hand-written SQL for CRUD; dialect quirks are isolated in `api/src/database/helpers/` (sequence reset, UUID formatting, timestamp read/write, geometry).

## 3. THE HARD PARTS

### (a) Safe write-back to arbitrary tables
Look at `createOne` (items.ts:115) and `updateMany` (items.ts:722). The pattern:
1. **Whitelist columns from the schema, never from input.** `fields = Object.keys(schema.collections[c].fields)`; aliases (non-columns like O2M) are stripped: `payloadWithoutAliases = pick(payloadWithA2O, without(fields, ...aliases))` (items.ts:213). Update also removes the PK: `without(fields, primaryKeyField, ...aliases)` (items.ts:831). So only real, known columns ever reach the DB.
2. **Identifiers are never interpolated.** Table/column names flow as Knex builder args — `trx.insert(payload).into(this.collection).returning(pk)` (items.ts:249), `trx(this.collection).update(payload).whereIn(pk, keys)` (items.ts:836), `trx(this.collection).whereIn(pk, keys).delete()` (items.ts:1148). Knex parameterizes values and quotes identifiers per-dialect; there is no template-string SQL in the write path.
3. **Type coercion before write** happens in `PayloadService.processValues('create'|'update', …)` (payload.ts:214): JSON/array fields are `JSON.stringify`-ed unless they're a `Knex.Raw` instance (payload.ts:262), geometry becomes `st_geomfromtext(...)` as a raw fragment (payload.ts:369), dates go through dialect date helpers, "special" fields run through a `transformers` map (hash, uuid, date-created…). Raw instances carry an `isRawInstance` flag so they escape stringification but are still emitted as bound fragments.
4. **PK handling** (items.ts:216-287): PK may be user-supplied (uuid/manual int) — validated by `validateKeys` (`api/src/utils/validate-keys.ts`) which throws `ForbiddenError` unless the value matches the column type (uuid regex, `Number.isInteger`). Otherwise `.returning(pk)` recovers it, with a MySQL/SQLite fallback `max(pk)` inside the same transaction, and an auto-increment sequence reset when a manual PK was injected (items.ts:376).
5. **Everything is transactional** via `transaction(this.knex, async trx => …)` (`api/src/utils/transaction.ts`); nested relational writes reuse `trx`, so any nested failure rolls back the whole tree. `createMany`/`updateBatch` fork the service onto the trx (`this.fork({knex})`, items.ts:66) and loop `createOne`/`updateOne`.
6. **DB errors are translated, not leaked.** Every write is wrapped in `try/catch → translateDatabaseError(err, data)` (`api/src/database/errors/translate.ts`). The Postgres dialect (`api/src/database/errors/dialects/postgres.ts`) maps SQLSTATE codes (`23505`→`RecordNotUniqueError`, `23503`→`InvalidForeignKeyError`, `23502`→`NotNullViolationError`, `22001/22003`→length/range) and parses the offending column out of `error.detail`, returning a typed, safe error.

### (b) Connection + credential security
`api/src/database/index.ts` — a **singleton** Knex (`let database: Knex | null`). Config comes only from **env** via `getConfigFromEnv('DB_', …)` (getDatabase:44). It supports either discrete `DB_HOST/PORT/DATABASE/USER/PASSWORD` or a `DB_CONNECTION_STRING`, validated per-client by `validateEnv(requiredEnvVars)`. **Single-tenant: one process = one database.** Pooling is Knex/tarn (`pool: poolConfig`), with `afterCreate` hooks per dialect (e.g. SQLite `PRAGMA foreign_keys=ON`). Query timing is instrumented via `.on('query'|'query-response')`. There is **no per-request credential** and no multi-DB registry — a lesson for us since we *are* multi-connection: we'll need a keyed pool map rather than a module singleton.

### (c) Permissions model
Two enforcement points, both in `api/src/permissions/modules/`:
- **Writes:** `processPayload` (`process-payload/process-payload.ts`) fetches the user's policies/permissions, rejects fields not in the allowed set (`createFieldsForbiddenError`), merges permission `presets` into the payload, and runs Joi-style `validatePayload` rules (field-nullable + per-permission `validation` filters). `updateMany`/`deleteMany` additionally call **`validateAccess`** (`validate-access/validate-access.ts`).
- **Row-level:** enforced by *read-back*. `validateItemAccess` (`validate-access/lib/validate-item-access.ts`) builds an AST filtered to the target PKs *with the permission rules applied*, reads from the DB, and compares the returned count to the requested keys — if you can't read a row under your policy, you can't update/delete it. Reads inject permission filters as SQL `CASE` expressions via `processAst` before `runAst`. Admin short-circuits (`accountability.admin === true`).

## 4. Clean code / idioms worth stealing
- **Custom error factory** `createError(code, message, status)` (`packages/errors/src/create-error.ts`) returns a class with `code`, `status`, `extensions`; `isDirectusError(e, ErrorCode.X)` narrows type. Each error is one tiny file (`packages/errors/src/errors/*.ts`).
- **Dialect isolation**: introspection, error mapping, and helpers each have a per-dialect file selected at runtime — new DB = new file, zero changes to callers.
- **AST as the read IR** decouples query parsing, permission injection, and SQL generation.
- **Layering**: thin controllers → services (business logic + events) → PayloadService (transforms) → Knex. Services take `{knex, schema, accountability}` uniformly, enabling trivial trx forking.
- **Testing**: co-located `*.test.ts` (Vitest) throughout `api/src` and `packages/`; plus `tests/` blackbox suite.

## TOP 5 PATTERNS TO STEAL
1. **Schema snapshot as a frozen in-memory `SchemaOverview`, introspected once** — `packages/schema/src/dialects/postgres.ts` (`overview()`) + `api/src/utils/freeze-schema.ts`. Introspect on connect, not per request.
2. **Column whitelisting from the schema before every write** — `api/src/services/items.ts:213` (`pick(payload, without(fields, ...aliases))`). The single most important injection/garbage guard.
3. **All CRUD through Knex builder args (identifiers never interpolated) inside a transaction** — `api/src/services/items.ts:249` / `:836` / `:1148` + `api/src/utils/transaction.ts`.
4. **SQLSTATE → typed error translation** — `api/src/database/errors/translate.ts` + `api/src/database/errors/dialects/postgres.ts`. Turns raw driver errors into safe, user-facing messages with the offending field.
5. **Custom error framework** — `packages/errors/src/create-error.ts` (+ `ErrorCode` enum, `isDirectusError`). One-liner typed errors with HTTP status and structured `extensions`.
