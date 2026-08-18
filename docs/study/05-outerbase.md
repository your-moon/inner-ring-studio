# Outerbase Studio — Study Notes

Clone: `docs/study/clones/outerbase`. A Next.js (App Router) web GUI for SQL databases, deployed to Cloudflare Workers (`open-next.config.ts`, `wrangler.jsonc`). Single package, **not** a monorepo — everything lives under `src/`.

## 1. Structure & organization

- `src/drivers/` — the **driver layer**. `base-driver.ts` (the abstract interface + all schema types), `common-sql-imp.ts` (shared SQL-dialect implementation), `query-builder.ts` (pure INSERT/UPDATE/DELETE builders), `iframe-driver.ts` (transport), and per-DB folders `postgres/`, `mysql/`, `sqlite/`, `database/` (turso, d1, rqlite, valtown…).
- `src/components/gui/` — the Studio UI. The **editable grid** is `src/components/gui/table-optimized/` (custom, no library). `table-result/` renders driver results into the grid; `tabs/` holds `query-tab.tsx` (SQL editor) and `table-data-tab.tsx` (browse+edit).
- `src/lib/sql/sql-execute-helper.ts` — bridges grid edits → driver operations.
- `src/indexdb.ts` — Dexie DB (`libstudio`) storing connections + saved docs client-side.

Dependency direction is clean and one-way: **UI → driver interface → dialect impl → transport**. The grid depends only on its own `OptimizeTableState`, never on a driver; the driver depends only on a `QueryableBaseDriver` transport, never on the UI.

## 2. Architecture — core abstractions

**Result shape** (`base-driver.ts:42`): `DatabaseResultSet { rows: Record<string,unknown>[]; headers: ColumnHeader[]; stat; lastInsertRowid? }`. Every driver returns this; the grid consumes only this. Schema browsing is `schemas(): DatabaseSchemas` (a `Record<schemaName, DatabaseSchemaItem[]>`) + `tableSchema(schema, table)`.

**SQL editor → results** (`tabs/query-tab.tsx`): CodeMirror editor; `onRunClicked` splits the buffer into statements (`splitSqlQuery`), runs each via the driver, stores `MultipleQueryResult[]` in state, and feeds each result into an `OptimizeTableState` rendered by the same grid used for table browsing. Dialect-aware (`databaseDriver.getFlags().dialect` picks `explain (format json)` for Postgres, etc.).

## 3. THE HARD PARTS

### (a) The editable data grid — fully custom

No grid library. `table-optimized/index.tsx` renders **one CSS-grid `<table className="grid">`** whose `gridTemplateColumns` is built from header widths. Virtualization is done by hand: `use-visibility-calculation.ts` computes the visible `{rowStart,rowEnd,colStart,colEnd}` from `scrollTop`/`scrollLeft` + `renderAhead`, and `TableFakeBodyPadding` / `TableFakeRowPadding` inject empty spacer rows/cells so only visible cells mount. Scroll listener recalculates; `useElementResize` handles container resize.

State is an **external mutable class**, `OptimizeTableState` (`optimize-table-state.tsx`) — *not* React state. React subscribes via `addChangeListener`; the store calls `broadcastChange()` (debounced 5ms) which bumps a `revision` counter to force one re-render. This decouples thousands of cell mutations from React's reconciler.

- **Selection**: rectangular `TableSelectionRange {x1,y1,x2,y2}` array with real set algebra — `mergeSelectionRanges` and `splitSelectionRange` support additive (Ctrl) and subtractive selection, plus full-row/full-col detection. `getCellStatus(y,x)` returns `{isFocus,isSelected,isBorderRight,isBorderBottom}` driving per-cell borders in `table-cell.tsx`.
- **Editing**: `createEditableCell.tsx` is a factory taking `toString`/`toValue` converters, returning a cell component. Double-click → `state.enterEditMode()`; renders an `<input>` (or opens a JSON/text full editor). Enter/Tab/Escape handled inline; Tab advances focus and commits without exiting. Edits call `state.changeValue(y,x,v)`.
- **Change tracking**: each row is `{raw, change?, changeKey?, isNewRow?, isRemoved?}`. `changeValue` diffs against original (deep-equal) and either records or *removes* the pending change; `changeLogs` indexes dirty rows. Cell background color encodes state (yellow=changed, green=new, red=removed) in `table-cell.tsx:37`.

### (b) The driver abstraction

`BaseDriver` (`base-driver.ts:290`) is the interface a new DB implements. Methods: `getFlags()`, `getCurrentSchema()`, `escapeId()`, `escapeValue()`, `query()`, `batch()`, `transaction()`, `schemas()`, `tableSchema()`, `selectTable()`, `findFirst()`, `updateTableData()`, `dropTable()`, `emptyTable()`, `createUpdateTableSchema()`, `createTrigger()`/`view()` etc., plus `columnTypeSelector` and `inferTypeFromHeader()`. `DriverFlags` declares capabilities (`supportInsertReturning`, `supportRowId`, `dialect`, `optionalSchema`…) that the generic code branches on.

Crucially the design is **two-layered**. `CommonSQLImplement` implements the heavy generic parts (`updateTableData`, `selectTable`, `findFirst`) once; `PostgresLikeDriver extends CommonSQLImplement` only supplies dialect specifics — `escapeId` (`"…"`), `getFlags`, and `information_schema`-based `schemas()`/`tableSchema()` (`postgres/postgres-driver.ts`). The driver receives a **`QueryableBaseDriver`** (`{query, transaction, batch?}`) in its constructor — the *transport*, separated from SQL grammar.

**How the browser reaches Postgres**: it does not connect directly. The transport is `EmbedQueryable` (`iframe-driver.ts`): in Electron it calls `window.outerbaseIpc.query()` (Node `pg` in the main process); in the web build it `postMessage`s the SQL to `window.parent`, which executes and posts back by request id. Browser-native engines (sqlite/d1/turso) instead implement the transport directly with `fetch` (see `app/proxy/d1/route.ts`). So **Postgres is a desktop/embed feature** — the README confirms MySQL/PG run via the Electron wrapper.

### (c) Edits → SQL, and credentials

`sql-execute-helper.ts:commitChange` reads `state.getChangedRows()`, and `generateTableChangePlan` maps each dirty row to a `DatabaseTableOperation` — INSERT for new rows, DELETE/UPDATE keyed by a `WHERE` built from `tableSchema.pk` and `row.raw[pk]`. `driver.updateTableData` (in `CommonSQLImplement`) runs them in a **single transaction** via `query-builder.ts` (`insertInto`/`updateTable`/`deleteFrom`, each using `dialect.escapeId`/`escapeValue`, appending `RETURNING *` when `supportInsertReturning`). Results flow back into `state.applyChanges`. `validateOperation` guards unsafe writes before execution.

**Credentials**: stored client-side only — Dexie/IndexedDB `libstudio` connection table (`indexdb.ts`) as `SavedConnectionRawLocalStorage {host, username, password, token}` (`connect/saved-connection-storage.ts`). Nothing is hosted server-side (optional cloud sync aside).

## 4. Clean code worth stealing

- **Capability flags over inheritance branching**: `DriverFlags` lets generic code adapt (`supportInsertReturning ? RETURNING…`) instead of subclass overrides.
- **Transport/dialect split**: the same `PostgresLikeDriver` works over iframe, IPC, or fetch by swapping the constructor arg.
- **External observable store + revision bump**: escapes React re-render cost for a data-dense grid.
- **Cell factory** (`createEditableCell`) parameterized by type converters — one editor, many column types.

## TOP 5 PATTERNS TO STEAL

1. **The `BaseDriver` interface + `DriverFlags` capability model** — `src/drivers/base-driver.ts`. The single seam that makes "add a database" mean "implement one class."
2. **Two-layer driver: dialect (`CommonSQLImplement`) vs transport (`QueryableBaseDriver`)** — `src/drivers/common-sql-imp.ts` + `src/drivers/iframe-driver.ts`. Lets the SQL layer run anywhere.
3. **Custom virtualized CSS-grid table with fake padding** — `src/components/gui/table-optimized/index.tsx` + `use-visibility-calculation.ts`. Renders thousands of rows/cols cheaply.
4. **`OptimizeTableState` — mutable observable store with change-tracking (`raw`/`change`/`isNewRow`/`isRemoved`) and selection-range algebra** — `src/components/gui/table-optimized/optimize-table-state.tsx`. The crown jewel of the editable grid.
5. **Diff-to-SQL commit pipeline** — `src/lib/sql/sql-execute-helper.ts` + `src/drivers/query-builder.ts`. Turns staged grid edits into a validated, PK-keyed, single-transaction batch.
