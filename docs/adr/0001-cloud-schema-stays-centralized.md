# ADR 0001 — Cloud schema bootstrap stays centralized and guarded

Status: Accepted (2026-08-21)

## Context

`src/lib/cloud-db.ts` creates the entire cloud (multi-tenant) schema in a single
`ensureSchema()` — one ~210-line multi-statement `pool().query(...)` covering
~12 tables plus the workspace migration/backfill block. An architecture review
flagged it as a "god-DDL" and suggested splitting each feature's DDL into its
owning module (`schedules.ts`, `boards.ts`, `comments.ts`, …) for locality.

Investigation weakened that suggestion on two points:

1. **It already runs once per process.** A module-level `schemaReady` flag
   (`cloud-db.ts:41-43,253`) short-circuits every subsequent call, so the ~40
   call sites that `await ensureSchema()` at the top of each mutation are
   near-free after the first. There is no repeated-execution cost to remove.
2. **The tables are tightly FK-ordered** (users → workspaces → members →
   connections → scheduled_queries → dependents, then the ALTER/backfill last).
   Any split still needs one ordered composer to preserve that creation order;
   independent per-module creation would break on first boot.

What remains is a modest locality gain (each `CREATE` next to its feature), and
it carries a real cost: today the whole schema and its order are readable in one
place; fragmenting it distributes that. `ensureSchema` is not a shallow
pass-through — it is a working, guarded, correctly-ordered, single-round-trip
bootstrap. It largely passes the deletion test as-is.

## Decision

Keep the cloud schema centralized in `cloud-db.ts`'s `ensureSchema()`. New
feature tables are added there, in FK order. Do **not** fragment the DDL into
per-module pieces purely for locality.

## Consequences

- One readable, ordered schema definition; new tables slot into the existing
  FK sequence.
- The real upgrade path, when we outgrow "idempotent CREATE-IF-NOT-EXISTS on
  boot" (destructive migrations, column drops/renames, data migrations that must
  run exactly once and be auditable), is a **versioned migration system** (a
  `schema_migrations` table + ordered, tracked migrations), not per-module
  fragmentation. That is the trigger to revisit this decision.
- Architecture reviews should not re-propose splitting `ensureSchema` by feature
  module without a new reason beyond locality.
