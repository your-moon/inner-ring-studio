# pmsql — Design Spec (fork of Outerbase Studio)

**Date:** 2026-08-18
**Status:** Approved; building.
**One line:** A self-hosted database workspace — configure connections from a **CLI**
(encrypted, syncable vault), then use a **web UI** (grid + SQL editor) to browse and
edit your own Postgres. Built by **forking Outerbase Studio** (AGPL-3.0) and adding
the three things it lacks: a Postgres proxy, a server-side encrypted vault, and a CLI.

Grounded in `docs/study/` (5-tool study) and direct recon of the Outerbase Studio repo.

---

## 1. Why fork, not build from scratch
Outerbase Studio already ships the expensive parts — a polished, custom **canvas-ish
editable grid**, a **CodeMirror SQL editor**, schema browser, and a `PostgresDriver`
with full introspection + write-back logic. It is **AGPL-3.0**, so our fork stays
open-source/AGPL — fine for a self-hosted personal tool.

What Outerbase deliberately leaves open is exactly our niche:
- It **can't reach Postgres from the browser** — it needs a transport (they use
  Electron IPC / iframe). We provide that transport as a **backend proxy**.
- Credentials live **client-side in IndexedDB** (per-browser, unencrypted). We replace
  that with a **server-side encrypted vault**.
- There's **no CLI**. We add one to manage the vault and launch the server.

## 2. The seam (verified in recon)
`PostgresDriver` (`src/drivers/postgres/postgres-driver.ts`) extends `CommonSQLImplement`
and pushes every statement through a transport: `this._db.query(sql)`. The transport
interface (`QueryableBaseDriver` in `src/drivers/base-driver.ts`) is essentially:

```ts
interface QueryableBaseDriver { query(sql): Promise<DatabaseResultSet>; /* + batch/transaction */ }
```

**So the entire backend contract is ~one method.** We implement `query(sql)` as an
HTTP call to our own Next.js API route that runs it against a real `pg` pool.

## 3. Architecture (one Next.js app + a CLI launcher)
```
  pmsql (CLI)                    Next.js app (forked Outerbase Studio)
  ├─ conn add/ls/rm  ──writes──> ┌─────────────────────────────────────┐
  ├─ serve           ──starts──> │  Web UI: grid + SQL editor (reused)  │
  └─ (vault file)                │  PostgresDriver (reused)             │
        encrypted                │    └─ transport → fetch('/api/query')│
                                 │  API routes (NEW):                   │
                                 │   /api/query     → pg pool proxy     │
                                 │   /api/conn      → vault CRUD        │
                                 │   /api/unlock    → decrypt vault     │
                                 └───────────────┬─────────────────────┘
                                        pg / pool │ (SSRF-guarded)
                                                  ▼
                                        user's own Postgres
```

## 4. Components we build

### 4.1 Postgres proxy — `src/app/api/query/route.ts` (NEW)
- Input: `{ connId, sql, params? }`. Resolves the live `pg.Pool` for `connId` from a
  **keyed pool registry** (key includes the session/user — no cross-connection reuse).
- Runs the query, maps `pg` result → Outerbase's `DatabaseResultSet` shape.
- **SSRF guard** on pool creation (block link-local/private IPs unless allowed).
- Read-only mode flag per connection (statement guard).

### 4.2 Encrypted vault — replaces `src/indexdb.ts` connection storage
- Vault file `~/.config/pmsql/vault.enc`: connection records (host/port/db/user/pass)
  **encrypted at rest** with a key derived from a master passphrase (scrypt/argon2 → AEAD).
- API: `/api/conn` (list/create/delete, secrets never returned to client),
  `/api/unlock` (passphrase → in-memory decrypt for the session).
- The UI's saved-connection calls point at these endpoints instead of Dexie.
- **Multi-device:** the vault is one encrypted file — sync via git/scp/Dropbox.

### 4.3 CLI — `pmsql` (NEW, thin)
- `pmsql conn add <name>` — prompt + write encrypted record into the vault.
- `pmsql conn ls` / `pmsql conn rm <name>`.
- `pmsql serve [--port 7070] [--host 127.0.0.1]` — launches the Next.js server.
- `pmsql export/import` — move the vault between devices.
- Same language as the app (Node/TypeScript) so it ships with it; single `npx pmsql`
  or a packaged binary later.

### 4.4 Airtable-flavored UI tweaks (incremental, after core works)
- Saved views (filter/sort/hidden-column per table), nicer filter builder — layered on
  the existing grid. Deferred until the connect→grid→SQL→edit loop works end-to-end.

## 5. What we reuse unchanged
The whole `src/components` grid + editor, `src/drivers/postgres/*` (introspection,
write-back), `common-sql-imp.ts`, schema browser, theming. We touch the **transport**
(point it at `/api/query`) and the **storage** (point it at the vault API).

## 6. Non-goals (v1)
- Non-Postgres engines (the driver layer supports them; we validate Postgres first).
- Cloud/multi-tenant SaaS. This is self-hosted / personal-server.
- Outerbase's cloud-sync features (`src/outerbase-cloud`) — leave dormant or strip.

## 7. Security must-haves
- Vault encrypted at rest; passphrase-derived key; secrets never sent to the browser.
- Pool-registry key scoped so connections can't leak across sessions.
- SSRF guard on every new pool.
- All SQL via `pg` parameterized where inputs exist; identifiers from schema, not input.
- Read-only mode enforced when set.

## 8. Licensing
Fork retains **AGPL-3.0** (`LICENSE` kept). Our modifications are published under AGPL.
Add a `NOTICE`/README crediting Outerbase Studio and stating the fork's changes.

## 9. Build milestones (thin vertical first)
1. **Fork runs locally** — clone into the repo, `npm install`, `npm run dev`, UI loads.
2. **Postgres proxy** — `/api/query` runs SQL against the seeded Postgres; wire the
   PostgresDriver transport to it → **connect + browse a table in the grid**.
3. **Write-back** — inline cell edit → proxy → verified UPDATE by PK.
4. **SQL editor** — run a SELECT through the proxy → results in the grid.
5. **Encrypted vault** — replace Dexie storage; `/api/conn` + `/api/unlock`.
6. **CLI** — `pmsql conn add` + `pmsql serve`.
7. **Airtable tweaks** — saved views, filters.
Each milestone leaves the app runnable and is independently verifiable.

## 10. Stack
Node + TypeScript, Next.js (inherited), React, CodeMirror, Radix (inherited); add `pg`
(node-postgres) + a crypto lib (node `crypto` scrypt/AES-GCM, or `age`/`libsodium`) for
the vault; a small CLI framework (or plain `node:util parseArgs`).
