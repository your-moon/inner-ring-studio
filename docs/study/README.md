# Study: web DB GUI / data-grid tools

Study-before-build for **pmsql** — a "better online DBeaver with Airtable UX" over
users' own Postgres. Read in this order:

1. **[00-synthesis.md](00-synthesis.md)** — START HERE. Shared idioms, missing
   pieces, and the build recommendation tied to our goal.
2. Per-repo analyses (each cloned for one lesson):
   - [01-nocodb.md](01-nocodb.md) — Airtable-over-existing-SQL; write-back + PK + pools
   - [02-teable.md](02-teable.md) — the canvas grid engine + sliding-window fetch
   - [03-directus.md](03-directus.md) — introspection snapshot + safe ItemsService + permissions
   - [04-beekeeper.md](04-beekeeper.md) — multi-DB driver interface + credential vault
   - [05-outerbase.md](05-outerbase.md) — web-DBeaver architecture + BaseDriver + grid
3. **deep/** — copy-when-coding extraction:
   - [deep/nocodb-writeback-deep.md](deep/nocodb-writeback-deep.md) — exact PK + write-back algorithm
   - [deep/driver-interface-deep.md](deep/driver-interface-deep.md) — driver method lists + our minimal set
4. **clones/** — shallow clones (`git clone --depth 1`), revisit any time.
