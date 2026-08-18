# Synthesis — "Better online DBeaver with Airtable UX" over users' own Postgres

Study of 5 exemplars: NocoDB, Teable, Directus, Beekeeper Studio, Outerbase Studio.
Per-repo detail in `01-05*.md`; copy-when-coding detail in `deep/`.

## Goal recap
Web app. Connect to a user's **own existing Postgres**. Introspect schema → fast
editable spreadsheet grid + SQL editor. v1 = Postgres only, driver layer so
MySQL/SQLite slot in later. We do **not** host the data.

---

## The idioms shared across ALL exemplars (settled practice)

1. **The browser never touches Postgres directly. A backend proxy owns every
   connection and is the only thing that builds SQL.** Outerbase punts this to a
   desktop app (Electron IPC / iframe) precisely because a *web-only* Postgres
   client is impossible in the browser — that gap is our whole product. Directus,
   NocoDB, Teable all run SQL server-side. → **Backend is the spine. Non-negotiable.**

2. **Introspect once, freeze, reuse.** Directus reads `information_schema` +
   `pg_index` into a frozen `SchemaOverview` snapshot passed to every request
   instead of re-reading per query (`packages/schema/`). NocoDB caches per-source
   column lists. → We build a cached, invalidatable schema snapshot per connection.

3. **All SQL through a query builder with bound parameters — never string
   concatenation.** All five use Knex (or an equivalent). Table/column names flow
   only as *builder arguments*; values only as *bindings*. Identifiers quoted with
   a per-dialect `wrapIdentifier`/`escapeId` (`"`-doubling for PG). The only place
   raw text is allowed is DDL positions Knex can't bind, and there they run an
   explicit allowlist/`sanitize()` (NocoDB cites a real blocked `CHECK(1=0)` exploit).

4. **Write-back is a diff of dirty rows → PK-keyed INSERT/UPDATE/DELETE in ONE
   transaction.** Beekeeper `TableChanges{inserts,updates,deletes}` (each edit
   carries its own `primaryKeys`), Outerbase `commitChange`, NocoDB `updateByPk`.
   Order: insert → update → delete. Roll back the whole batch on any error.

5. **Primary-key identification for arbitrary tables is a first-class helper**,
   handling single **and composite** PKs plus per-type coercion (numeric, uuid,
   bytea). Tables with **no PK** are the sharp edge — must be handled explicitly
   (read-only, or ctid/all-columns fallback), never assumed away.

6. **The editable grid is a hand-rolled CANVAS engine in 4 of 5** (Teable, NocoDB,
   Outerbase custom DOM+virtualization; only via-library nowhere). Common core:
   virtualization over a sliding window of rows (Teable `{skip,take}` page 300;
   NocoDB 50-row chunks), an external mutable state store that bypasses React/Vue
   re-render on scroll, and a `getCellContent`/`onCellEdited` callback seam.

7. **Driver = small abstract surface + big concrete base.** Beekeeper: concrete
   drivers implement only `rawExecuteQuery`/`getBuilder`/`supportedFeatures`, inherit
   ~40 methods. Outerbase: `CommonSQLImplement` (generic SQL once) + `PostgresLikeDriver`
   (dialect specifics) + a `DriverFlags` capability object generic code branches on.
   → Postgres-first, but define the interface now so a second engine is additive.

8. **Credentials encrypted at rest under a dedicated key.** NocoDB AES +
   `NC_CONNECTION_ENCRYPT_KEY`; Beekeeper column transformers under a per-install
   `~/.key`. Never plaintext in the metadata store.

9. **Connection pooling: a keyed registry of live pools, one per data source** —
   and this is the documented footgun. NocoDB keys pools `base_id:id` and a code
   comment records a **real cross-tenant credential leak** from a mis-keyed pool.
   → The pool-registry key must be unambiguous and include the owning account.

---

## Missing critical pieces our goal needs that NO exemplar fully provides

- **A web-native Postgres proxy for users' OWN databases.** Outerbase (closest web
  analog) explicitly can't do web Postgres — it needs Electron. Directus/NocoDB
  connect to a DB the *operator* configures, not an arbitrary DB a *logged-in user*
  supplies at runtime. Our multi-user + arbitrary-connection combination is the
  novel composition: **per-user encrypted connection records + a keyed live-pool
  registry + SSRF/allowlist guards on outbound connections.**
- **SSRF / network egress control.** Users hand us a hostname to connect to. Only
  NocoDB guards this (external sources). We must, from day one: block metadata IPs
  (169.254.169.254), private ranges unless allowed, and validate the resolved IP.
- **Read-only vs read-write mode** as an explicit, enforced connection property
  (Beekeeper has a read-only statement guard) — safety default for "just browsing".

---

## Recommendation for THIS build

**Architecture:** classic client/server, not browser-native.
- **Backend (Node + TypeScript + Knex + `pg`)** owns: connection registry (keyed
  per user+connection, encrypted creds), schema introspection (frozen snapshot),
  a **`Driver` interface** with a Postgres impl, safe write-back (PK diff →
  parameterized txn), a SQL-editor execute endpoint (read-only guard), and a
  row-window API `{table, filter, sort, skip, take}` → parameterized SELECT.
- **Frontend (React + TypeScript)**: schema tree + **`glide-data-grid`** for the
  editable virtualized grid. This is the one deviation from the exemplars — they
  hand-rolled canvas grids over years; `glide-data-grid` is that same canvas
  approach as a maintained library (getCellContent/onCellEdited seam, millions of
  rows, cell editors), letting us match the "feels better than DBeaver" bar in
  weeks not months. Re-evaluate a custom engine only if the library blocks us.
- **SQL editor**: CodeMirror 6 + SQL mode; results reuse the same grid (read-only).

**Key decisions the study settled:**
- Backend proxy, not browser-direct. (idiom 1)
- Knex everywhere; identifiers as args, values as bindings; allowlist for DDL. (idiom 3)
- Frozen schema snapshot per connection, invalidatable. (idiom 2)
- Write-back = PK-diff → one transaction; no-PK tables read-only in v1. (idioms 4,5)
- Driver interface defined now, Postgres-only impl. (idiom 7)
- Encrypted creds + keyed pool registry with account in the key + SSRF guard. (idioms 8,9)
- Grid: adopt `glide-data-grid` rather than hand-roll. (idiom 6, pragmatic deviation)

**v1 slice (thin vertical):** connect a Postgres DB → see schema tree → open a
table → virtualized grid reads a row window → edit a cell → safe UPDATE by PK →
run a SELECT in the SQL editor → results in the grid. Everything else (views,
saved filters, relations, more engines) layers on after this works end-to-end.
