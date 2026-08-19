# Inner Ring Studio — Continuation Guide

Everything an agent (or human) needs to pick this up: what it is, how to access,
how to deploy, where things live, and what's done vs pending.

## What it is

A PostgreSQL/ClickHouse workspace (fork of Outerbase Studio, AGPL — the Outerbase
CLOUD layer was fully removed 2026-08-19, rebranded to Inner Ring Studio). Grid
data browsing/editing, SQL editor. Runs in three modes via `DEPLOY_MODE`:
- **desktop** — offline, local encrypted vault, no login.
- **selfhosted** (default) — one app password, encrypted git-synced vault. This is
  the live `db.carrot-soft.tech`.
- **cloud** — real accounts (email+password), per-user connections isolated in a
  Postgres, passwords encrypted at rest. Code + tests done & verified locally;
  LIVE at https://cloud.carrot-soft.tech (grape-2 /opt/inner-ring-cloud, own Postgres irs-cloud-db). Deploy guide: `deploy/CLOUD.md`.

Mode seams: `src/lib/mode.ts` picks a `ConnectionStore` (vault vs `cloud-db.ts`);
`auth.ts` sessions carry a `userId` in cloud mode. See `README.md`.

## Repos

- **Code:** `github.com/your-moon/inner-ring-studio` (this repo) — Next.js app + `pmsql` CLI.
- **Desktop:** `github.com/your-moon/inner-ring-studio-desktop` — Electron app that
  bundles + runs this server locally (fully offline). Build: `npm i && npm run build:mac`.
- **Config vault repo:** `github.com/your-moon/db-config` — where the encrypted
  vault can be git-synced (currently empty; hosted instance keeps its vault on grape-2).

## Access

- **Live URL:** https://db.carrot-soft.tech
- **Login:** password is `PMSQL_AUTH_PASSWORD` in `/opt/inner-ring-studio/.env` on grape-2
  (do not hardcode it; read it there). Auth is enabled only when that env var is set.
- **Server:** `ssh grape-2` (root@187.52.116.86). App dir: `/opt/inner-ring-studio/`.

## Architecture

- **Web:** browser → Next.js server (grape-2) → `node-postgres` → DB. Browser never
  connects to the DB (browsers can't open raw TCP). The server holds the vault + pools.
- **Desktop:** the same server runs locally on the user's machine (loopback); the DB is
  reached directly from that machine. No grape-2 involved.
- **DB engines:** Postgres (full). ClickHouse (backend proxy done, **frontend driver
  not done** — see Pending). Driver routing keyed by `connection.driver`.

## Deploy (hosted, on grape-2)

The container is a plain `docker compose` service behind the existing Traefik
(labels route `Host(db.carrot-soft.tech)` → :3000, LE cert resolver `letsencrypt`).
grape-2 also runs the **grape** Swarm stack — do not touch it.

```bash
# from this repo, after committing:
rsync -az --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='out' \
  --exclude='.open-next' --exclude='.wrangler' --exclude='docs' --exclude='trials' --exclude='demo' \
  ./ grape-2:/opt/inner-ring-studio/app/
ssh grape-2 'cd /opt/inner-ring-studio && docker compose up -d --build'
```

- Build note: the whole-project `tsc` OOMs, so `next.config.js` sets
  `typescript.ignoreBuildErrors` + `eslint.ignoreDuringBuilds`. Per-route type-checking
  still runs in `bun run dev`. Verify a production build locally with
  `NODE_OPTIONS=--max-old-space-size=6144 bun run build` (needs `.next/standalone/server.js`).
- Env change (e.g. password) needs `docker compose up -d --force-recreate` (a bare
  `docker restart` keeps the old env_file values).
- Secrets/vault live in `/opt/inner-ring-studio/{.env,vault/vault.enc}` (chmod 600).

## Local dev

```bash
bun install                        # this repo uses Bun, not npm
bun run dev                        # http://localhost:3008
PMSQL_PASSPHRASE=… bun run src/cli/pmsql.ts conn add … / ls / serve
```

Sample DB for testing: `trials/nocodb/docker-compose.yml` → Postgres on `localhost:5434`
(db/user/pass all `shop`), plus seeded tables incl. composite-PK + no-PK cases.

## Verifying UI changes (no Chrome extension)

Use headless Playwright to log in + screenshot the live site, then `Read` the PNG:
scripts live in the scratchpad `shots/` dir (login with the password from grape-2's
`.env`). This is how every UI change in this project was visually verified.

## Key modules

- `src/lib/vault.ts` — encrypted vault (AES-256-GCM, scrypt; `PMSQL_PASSPHRASE`).
- `src/lib/config-repo.ts` — git-backed vault sync (any provider).
- `src/lib/pg-pool.ts` — pg pool registry (status/close/test); read-only via
  `default_transaction_read_only`; timezone via server options.
- `src/lib/clickhouse.ts` — ClickHouse HTTP proxy (read-focused).
- `src/lib/auth.ts` — HMAC session cookie login (Web Crypto); `requireAuth()` guards APIs.
- `src/lib/query-history.ts` — frecency-ranked query history (localStorage).
- `src/app/api/query/route.ts` — the SQL proxy: pg (cursor-capped) + clickhouse branch,
  array/object→JSON cell normalization, timestamp/json string parsers.
- `src/app/api/{connections,db,config,ai/sql,auth/*}/route.ts` — connections CRUD,
  connection manager (status/retry/disconnect/read-only), vault-storage, Claude-CLI SQL, auth.
- `src/cli/pmsql.ts` — the CLI (conn add/ls/rm/set, serve, config link, sync, passphrase change).
- Sidebar/nav: `src/app/(outerbase)/nav-layout.tsx`, `nav-connection-item.tsx`.
- Studio DB navigator: `src/components/gui/sidebar/connections-sidebar.tsx`.

## Env vars

`PMSQL_PASSPHRASE` (vault key), `PMSQL_VAULT` (vault path), `PMSQL_TZ` (session tz,
`Asia/Ulaanbaatar`), `PMSQL_AUTH_PASSWORD` (enables login), `PMSQL_MAX_ROWS` (editor
fetch cap, default 5000).

## Status — DONE & deployed

Rebrand + hosting + TLS + app login; CLI + encrypted vault + git-config + vault-storage
UI; vms-prod (read-only) + vms-dev connected; folders + collapsible sidebar folders;
sidebar DB list with active badge + right-click Retry/Disconnect/Edit/Delete; connection
manager; current-DB label; read-only mode (Postgres-enforced); local-time timestamps;
jsonb + array/object cells rendered as text; column widths fit header names; keep-old-
results-on-load; editor persistence; frecency query history; Ask AI (Claude CLI); studio
Databases navigator; removed Outerbase promo UI; connection edit/delete; **cursor row-cap
perf** (fetch first N, `PMSQL_MAX_ROWS`); table-list bounded scroll; offline desktop app.

## Status — recently DONE (were pending)

1. **ClickHouse (read-focused)** — DONE. `src/lib/clickhouse.ts` (HTTP proxy) +
   `/api/query` branch + `src/drivers/clickhouse/clickhouse-driver.ts` (system-table
   introspection, backtick quoting) + `createLocalDriver` branch + vault page reads the
   driver. Connect + schema tree + SQL editor verified against `clickhouse.mtm.mn:8123`
   (connection `clickhouse-prod`, read-only). No grid write-back (ClickHouse is OLAP).
2. **Row detail** — DONE. Focus a cell, press **Space** → `src/components/gui/row-detail-dialog.tsx`
   shows every column of the row (Tab is reserved for cell navigation).
3. **Table right-click sort** — DONE. Right-click the "Tables" header → sort by name/size
   (`schema-sidebar.tsx` context menu, `schema-sidebar-list.tsx` `sortTable`, persisted).
4. **Jump to reference (FK nav)** — already inherited from Outerbase (`generic-cell.tsx`
   renders a FK link/preview when a column has `referenceTo`, populated by the constraint
   introspection). Verified FK constraints come through.
5. **Top-N / large ORDER BY** — DONE. `/api/query` appends `LIMIT PMSQL_MAX_ROWS` (default
   1000) to plain editor SELECTs so Postgres uses the index (13s → ~1.6s on the 3M table)
   and reads via a cursor. Only the single-statement editor path is capped.

## Status — security review + tests (2026-08-18)

- **Security review** — passed. `requireAuth()` guards every data/mutating route
  (query, connections CRUD, db, config, ai/sql); only auth login/logout/me are public
  by design. No secret/connection logging anywhere. AI SQL uses `execFile` (arg array,
  no shell) — injection-safe. Read-only is Postgres-enforced (`default_transaction_read_only`).
  Session cookie is httpOnly + `secure` in prod + `sameSite=lax` (CSRF-mitigated).
  Two notes: (1) SSRF guard only blocks `169.254.169.254` — acceptable, an authed user
  connects to their own private-IP DBs; (2) **added login brute-force protection** —
  in-memory per-IP cap (10 fails / 15 min → 429) in `api/auth/login/route.ts`.
  ⚠️ Rate-limiting is live only after a redeploy (see Deploy above).
- **Test suite** — `bun run jest`, 124 tests / 13 suites green. New security-critical
  suites: `src/lib/vault.test.ts` (encrypt round-trip, wrong/missing passphrase, no
  password in `listConnections`, update keeps/rotates password), `src/lib/auth.test.ts`
  (constant-time password check, token forge/tamper/rotation rejection), `src/lib/sql-topn.test.ts`
  (`wrapForTopN` only rewrites safe single SELECTs), `src/drivers/sqlite/sql-escape.test.ts`
  (write-back quote-doubling neutralizes injection). `wrapForTopN` extracted from the
  query route into `src/lib/sql-topn.ts` (pure, testable). `jest.config.ts` now ignores
  `docs/study/clones/` + `.next/` (were causing haste collisions / obsolete-snapshot noise).

## Status — lazy pagination (2026-08-19) — DONE & deployed

Editor result grid now lazy-loads (DBeaver-style fetch size): first page ~200 rows,
more pages load as you scroll. Correct regardless of ORDER BY because it uses a **held
server cursor**, not LIMIT/OFFSET re-runs (no duplicate/skipped rows).

- **Server:** `src/lib/query-cursor.ts` — a registry of held pg cursors (each keeps its
  checked-out client open), keyed by a generated id; idle-swept at 90s, capped at 16 live
  (evict oldest), drained cursors release immediately. `/api/query` gained `paginate`
  (open cursor + first page → `{result, cursorId, hasMore}`), `fetchMore` (`{cursorId}` →
  next page `{rows, hasMore}` or `{expired:true}`), and `closeCursorId`. Only SELECT/WITH
  are paginated (never a write). Integration test `src/lib/query-cursor.test.ts` proves
  no-dupes/no-gaps against the sample DB.
- **Transport/driver:** `PostgresProxyQueryable.queryPaginated/fetchMorePage/closePage`
  (postgres-proxy.ts); `PostgresLikeDriver.supportsPagination/queryPaginated/fetchMorePage/
  closePage`; optional methods on `QueryableBaseDriver`; `DatabaseResultSet` gained
  `cursorId?`/`hasMore?`.
- **Client:** `OptimizeTableState.appendData()` appends rows in place + broadcasts (scroll
  preserved); `OptimizeTable`/`use-visibility-calculation` gained `onScrollToBottom` (fires
  ~8 rows before bottom); `multipleQuery(..., {paginatePageSize:200})` runs a lone SELECT
  through the paginated path; `query-result-tab.tsx` holds the cursor, loads more on scroll,
  shows "N loaded, scroll for more…", releases the cursor on unmount.
- Verified live on the 3M-row `order_requests`: page 1 in ~1s, fetch-more ~1s.

## Status — saved views (2026-08-19) — DONE & deployed

Table browser can save the current filter + sort + visible columns under a name and
re-apply in one click. A "Views" button sits in the table-data toolbar (badge = count).

- `src/lib/saved-views.ts` — localStorage CRUD keyed by `pmsql.savedViews:${pathname}:${schema}.${table}`
  (same per-connection keying convention as the editor draft + sidebar-collapse state).
  Local to the device, like the app's saved queries + history. Unit-tested (`saved-views.test.ts`).
- `src/components/gui/table-result/saved-views-button.tsx` — the Views popover (list/apply/delete +
  name-and-save). `filter-column.tsx` now also returns `setColumnIndexList` so a view can
  restore column visibility. Wired in `table-data-tab.tsx` (`applyView` sets where/sort/columns).
- Verified live: saved "Org 1 actions" (`org_id = 1`) on `action_logs`, persisted to localStorage,
  badge shows count, subtitle shows the filter.
- **Not synced across devices** (localStorage, matching existing saved queries/history). A future
  upgrade could store views in the git config repo for multi-device sync.

## Status — connect UX + ClickHouse hardening (2026-08-19) — DONE & deployed

- **Inline connect loading** — `schema-provider.tsx` no longer blocks the whole studio
  behind a full-screen `ConnectingDialog`; it exposes `loading`/`error`/`refresh` and
  `schema-sidebar.tsx` shows them inline (spinner / error box + Retry). Workspace renders
  immediately (verified chrome at 700ms). A transient schema error is now non-blocking.
- **ClickHouse instant load** — CH had no row cap (loaded whole tables). Now paginated like
  Postgres, but stateless: LIMIT/OFFSET via CH `limit`/`offset` *settings*, offset carried
  in an opaque cursor token; `DatabasePage.nextCursorId` + client adopts it.
- **ClickHouse connection hardening** (from a best-practice study vs ClickHouse docs +
  Grafana/DBeaver/clickhouse-js — `src/lib/clickhouse.ts`):
  - `readonly:1`→`readonly:2` (still blocks writes — verified — but allows attaching settings;
    `readonly:1` locks all settings, which is why guardrails couldn't be added before).
  - Guardrails on every query: `max_execution_time:30`, `max_result_rows:1e6` +
    `result_overflow_mode:break`, `max_memory_usage:4GB`.
  - **64-bit int corruption fixed**: `output_format_json_quote_64bit_integers:1` + map
    Int64/UInt64/128/256 → TEXT (were rounding ids > 2^53 in JS; CH 25.8 flipped the default).
    Decimal → TEXT too. Verified: `9007199254740993` and UInt64 max now exact.
  - Response compression on. Confirmed correct (no change): HTTP transport, Basic-auth header
    (no query-string leak), `system.*` introspection, JSONCompact at ≤200 rows/page.

## Status — still PENDING / nice-to-have

- **ClickHouse follow-ups from the study** (P1/P2, not yet done): tolerate `total_bytes = NULL`
  in the table list (views/Distributed show 0 today, should be blank); enrich introspection
  (table/column comments, PK/sorting-key flags via `system.columns.is_in_*`, engine); keyset
  pagination on the sorting key for very deep scrolls (OFFSET re-scans skipped rows).

- **Git-synced saved views** — currently per-device localStorage; could move to a `views.json`
  in the config repo (committed by config-repo.ts) for cross-device sync.
- **`docs/superpowers/specs/2026-08-18-pmsql-design.md`** predates most features — this
  guide supersedes it.
