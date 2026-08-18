# Teable — Study Notes (grid + Postgres-native data model)

Clone: `/Users/munkherdene/my/pmsql/docs/study/clones/teable` · v1.10.0 · AGPL · pnpm monorepo.

## 1. Structure & organization
Monorepo with two apps and shared packages (`pnpm-workspace.yaml`):
- `apps/nextjs-app` — the client. The grid *feature wiring* lives in `apps/nextjs-app/src/features/app/blocks/view/grid/` (`GridViewBaseInner.tsx` etc.).
- `apps/nestjs-backend` — NestJS API + realtime (ShareDB), `apps/nestjs-backend/src/features/record/record.service.ts` (3000+ lines) is the row-fetch engine; `apps/nestjs-backend/src/share-db/` is the realtime plane.
- `packages/sdk` — **the reusable, headless grid engine** lives at `packages/sdk/src/components/grid/`. This is the crown jewel and is app-agnostic.
- `packages/sdk/src/components/grid-enhancements/` — Teable-specific glue (async record fetching, editors, columns) that adapts the pure grid to Teable's data.
- `packages/core` — isomorphic models/schemas (Zod), shared by front and back (`RecordOpBuilder`, view schemas).
- `packages/db-main-prisma` (metadata plane: tables/fields/views registry, `prisma.service.ts`) and `packages/db-data-prisma` (the *data plane* — actual user-row tables). **Two separate Postgres connection pools**: `META_KNEX` vs `DATA_KNEX` (`apps/nestjs-backend/src/global/knex/knex.module.ts`).
Dependency direction: `core` ← `sdk` ← `nextjs-app`; backend also depends on `core`. Grid depends on nothing Teable-specific — clean seam we can reuse.

## 2. Architecture
- **Postgres-native model**: each user table is a *real Postgres table* (`db-data-prisma`). Metadata (field defs, views, filters) lives in a separate meta DB. Reads are compiled to SQL via **Knex** and run through a `databaseRouter.queryDataPrismaForTable(tableId, sql, ...bindings)` (`record.service.ts:2306`). This BYODB-style routing is exactly our target: introspected schema → SQL.
- **Row request shape**: `IGetRecordsRo = { skip, take, viewId, filter, orderBy, groupBy, search, projection, ... }`. Frontend never sends "rows N..M" as offsets it computes blindly; it sends `{skip, take}` windows.
- **Realtime**: ShareDB over WebSocket. The client subscribes to a query (`packages/sdk/src/context/use-instances/useInstances.ts` — dedup cache of subscribe-queries by key, refcounted), and receives docs whose `op batch` events mutate `doc.data` in place. Server publishes record ops at authoritative versions.

## 3. THE HARD PARTS

### (a) The editable virtualized grid — CANVAS, custom, no library
Rendering is **HTML canvas, hand-written**, not DOM rows and not a library (`packages/sdk/src/components/grid/`). Architecture is layered:
- **`RenderLayer.tsx`** owns a single `<canvas className="pointer-events-none">`. A `useEffect` calls `drawGrid(mainCanvas, cacheCanvas, props, lastProps)` on every prop change.
- **`renderers/layout-renderer/layoutRenderer.ts`** (2219 lines) is the draw engine. `drawGrid` (line 2134) does the key tricks:
  - **HiDPI**: `pixelRatio = Math.ceil(devicePixelRatio)`, canvas backing store sized `w*pixelRatio`, then `ctx.scale(pixelRatio, pixelRatio)`.
  - **Two-canvas cache**: cell body is drawn into an offscreen `cacheCanvas` via `drawCacheContent`, then blitted onto the main canvas with `drawImage`. Overlays (headers, active cell, collaborators, search cursor, fill handle, resize handle) are drawn *fresh* on top each frame. So scrolling/hover doesn't repaint every cell.
  - `computeShouldRerender(props, lastProps)` gates whether the expensive cell layer redraws at all.
- **Windowing**: `useVisibleRegion.ts` derives `startRowIndex/stopRowIndex/startColumnIndex/stopColumnIndex` from scroll offset via a `CoordinateManager`. `calcCells` (layoutRenderer:124) loops *only* visible `[startColumn..stopColumn] × [startRow..stopRow]`, building draw-prop lists. Freeze region drawn separately.
- **`managers/coordinate-manager/CoordinateManager.ts`**: variable row/col sizes via a lazily-built `rowMetaDataMap`/`columnMetaDataMap` of `{offset,size}` (binary-search style incremental measurement, `getCellMetaData`). O(1) offset→index lookups; supports per-row heights and frozen columns (`freezeRegionWidth`).
- **Millions of rows**: the browser can't have a 30M-px scroll element, so `InfiniteScroller.tsx` maps a *real* DOM scrollTop to a *virtual* scrollTop (`virtaulOffsetY` correction in `scrollTo`) using the `scroller` package, and only a window of records is ever in memory (see 3b).
- **Editing/selection**: `InteractionLayer.tsx` (938 lines) is a transparent interaction surface stacked over `RenderLayer`. Mouse/keyboard → `hooks/useSelection.ts` + `hooks/useKeyboardSelection.ts` maintain a `CombinedSelection` (`managers/selection-manager/CombinedSelection.ts`) supporting cell/row/column ranges. Inline edit renders a real DOM `EditorContainer.tsx` positioned over the active cell (Text/Number/Select/Boolean/Rating editors + rich enhancement editors in `grid-enhancements/editor/`). `onCellEdited([col,row], newCell)` is the single write callback. Cell values come from a caller-supplied `getCellContent(cell): ICell` — the grid is data-source agnostic.

### (b) Row fetching against Postgres
Sliding-window pagination. `packages/sdk/src/utils/record-window.ts`: `INITIAL_LOAD_PAGE_SIZE=100`, `LOAD_PAGE_SIZE=300`. `computeNextWindowQuery(loaded, y, height, fullTake)` checks if the viewport left the loaded window (with a 1/3-page buffer) and returns a new `{skip, take}` snapped to a `pageGap = fullTake/3` grid, else `null` (no refetch). `use-grid-async-records.ts` debounces visible-region changes (30ms, 500ms maxWait), keeps a **windowed `IRecordIndexMap` keyed by absolute row index** (retains ±`take` neighbors, evicts the rest), and seeds first-screen rows from a session snapshot store (`useGridViewCacheStore`) so a table switch-back paints instantly.
Backend: `record.service.ts` `getDocIdsByQuery` (2250) → `buildFilterSortQuery` (904) builds a Knex query from view filter/sort/group/search + a permission builder, selects only projected fields, `.offset(skip).limit(take)` (capped at 1000), `.toSQL().toNative()` → parameterized SQL executed on the *data* Postgres. IDs first, then hydrate fields (`getRecordsFields`, 2537). Sort defaults to a `basicSortIndex` order column.

### (c) How writes flow
`packages/sdk/src/model/record/record.ts` `updateCell(fieldId, value)`:
1. **Optimistic local**: `onCommitLocal` builds a `RecordOpBuilder.editor.setRecord` op, mutates `doc.data.fields[fieldId]` in place and `doc.emit('op batch', [op], false)` — grid repaints immediately. Note the deliberate comment: it does **not** bump `doc.version`, letting the server publish the authoritative op.
2. **REST**: `await updateRecord(tableId, id, {record:{fields}})`.
3. **Reconcile**: on success, computed/link/attachment fields are re-synced from the response (`updateComputedField`); the ShareDB subscription later delivers the canonical op.
4. **Rollback**: on error, `onCommitLocal(fieldId, oldCellValue)` reverts and toasts. Simple optimistic-with-rollback + realtime as the source of truth.

## 4. Clean code worth stealing
- Strong TS: discriminated unions for regions/selection (`interface.ts`), Zod schemas in `core`. Managers are plain classes (testable: `Coordinate-manager.spec.ts`, `useSelection.spec.ts`, `freeze.spec.ts`, `use-grid-async-records.spec.tsx`).
- Dense, *intent-explaining* comments on the hard concurrency/caching invariants (the async-records hook is a masterclass in documenting why, not what).
- Clear layering: pure render engine (canvas) ⟂ interaction ⟂ data adapter. Files are large but single-responsibility.

## TOP 5 PATTERNS TO STEAL
1. **Two-canvas cached rendering** — offscreen cell cache blitted, overlays redrawn per frame, `computeShouldRerender` gate. `packages/sdk/src/components/grid/renderers/layout-renderer/layoutRenderer.ts` (`drawGrid`, ~2134) + `RenderLayer.tsx`.
2. **CoordinateManager for windowing with variable sizes + frozen cols** — lazy `{offset,size}` metadata maps, O(1) scroll→index. `packages/sdk/src/components/grid/managers/coordinate-manager/CoordinateManager.ts`.
3. **Sliding-window pagination decoupled from scroll** — `{skip,take}` snapped to a page grid with buffer, only refetch on window exit. `packages/sdk/src/utils/record-window.ts` + `grid-enhancements/hooks/use-grid-async-records.ts`.
4. **Data-source-agnostic grid via `getCellContent`/`onCellEdited` callbacks** — the grid knows nothing about Postgres; perfect for our BYODB adapter. `packages/sdk/src/components/grid/Grid.tsx` (props at ~171), `InteractionLayer.tsx`.
5. **Knex → parameterized SQL per-table with skip/limit + separate meta/data pools** — `record.service.ts` `buildFilterSortQuery`/`getDocIdsByQuery` and `global/knex/knex.module.ts` (`META_KNEX` vs `DATA_KNEX`). Directly maps to "introspect user's Postgres, compile safe windowed SQL."
