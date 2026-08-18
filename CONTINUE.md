# Inner Ring Studio — Continuation Guide

Everything an agent (or human) needs to pick this up: what it is, how to access,
how to deploy, where things live, and what's done vs pending.

## What it is

A self-hosted PostgreSQL workspace (fork of Outerbase Studio, AGPL). Grid data
browsing/editing, SQL editor, encrypted git-synced connection vault, app login.
Runs **hosted** (web) or **fully offline** (desktop). See `README.md`.

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

## Status — still PENDING / nice-to-have

- **Truly-instant large results** — lazy pagination (fetch ~200, load more on scroll) in
  the SQL-editor result grid, like DBeaver's fetch size. Currently one-shot capped at
  `PMSQL_MAX_ROWS`. The table-browse grid already paginates; the editor grid does not.
- **`docs/superpowers/specs/2026-08-18-pmsql-design.md`** predates most features — this
  guide supersedes it.
