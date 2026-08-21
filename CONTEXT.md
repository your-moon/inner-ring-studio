# Inner Ring Studio

A database GUI for browsing, querying, and editing a user's own Postgres, MySQL, and ClickHouse, runnable as a desktop app, a self-hosted server, or a multi-tenant cloud. This glossary pins the terms that are overloaded or ambiguous in this codebase; use these words, avoid the listed alternatives.

## Language

### Drivers & execution

**Client Driver**:
The browser-side abstraction (extends Outerbase's `BaseDriver`) that a connection's UI talks to; it serializes a request and sends it to the query endpoint. It is NOT the thing that runs SQL against the database.
_Avoid_: driver (ambiguous on its own), server driver.

**Executor**:
The server-side, per-dialect implementation that actually runs the query verbs (single, paginate, fetch-more, close, statements) behind the query endpoint. One per dialect.
_Avoid_: driver, backend driver, service.

**Dialect**:
A SQL flavour (postgres / mysql / clickhouse / sqlite) reduced to just the facts that vary between them (identifier escaping, DDL tokens, pagination style). Carried as a small descriptor.
_Avoid_: database type, engine, flavor.

**Pool**:
The live, reused set of network sockets to one running database, keyed by connection identity. Distinct from a Connection (which is only the saved target).
_Avoid_: connection, client.

### Schema editing

**Schema change**:
The in-progress edit to a table's structure — a `DatabaseTableSchemaChange` holding old/new pairs for the table name, each column, and each constraint. The schema-change module builds and mutates it (add/change/reorder column, add/change/remove constraint, rename, discard) as pure functions; a Dialect's generator then turns the finished change into DDL. Distinct from the generated SQL and from the live table.
_Avoid_: diff, migration, patch, edit state.

### Connections & storage

**Connection**:
A saved database target the user browses, its host, port, database, driver, and (encrypted) credentials. It is a stored record, not a live socket and not the remote server itself.
_Avoid_: database, DB (those are the remote server), datasource, session.

**Vault**:
The encrypted, git-backed local store of the user's Connections on their own machine.
_Avoid_: config, keychain, secrets store.

**Connection Store**:
The interface that persists and resolves Connections, with two adapters: the local vault-backed store and the cloud (workspace-scoped) store.
_Avoid_: repository, DAO, manager.

### Cloud & deployment

**Workspace**:
The cloud tenancy and sharing unit. Every cloud user has one personal Workspace and may own or join shared ones; Connections, boards, schedules, and comments are all scoped to a Workspace.
_Avoid_: team, organization, account, tenant, project.

**Deploy mode**:
Which of the four ways the server is running: desktop, self-hosted, cloud, or linked. Behaviour (auth, storage, forwarding) branches on this.
_Avoid_: environment, target.

**Linked mode**:
A desktop app signed in to a remote cloud account: the collaborative cloud-feature requests are forwarded to the cloud, while database queries still run locally, straight from the machine to the database.
_Avoid_: online, connected, hybrid.

**Offline**:
A desktop app that is simply not signed in to the cloud. Database queries still go directly over the network to the user's databases, "offline" refers only to the cloud, never to network access.
_Avoid_: disconnected, local-only, air-gapped.

### Pagination & ranking

**Cursor**:
An opaque pagination token the client passes back to fetch the next page. Two shapes hide behind it, a held server-side cursor (Postgres) and a stateless offset token (MySQL / ClickHouse), and callers must not depend on which.
_Avoid_: page token, offset, keyset (be specific only inside an executor).

**Frecency**:
The zoxide-style ranking (frequency weighted by recency) that floats a user's most-used queries and tables to the top.
_Avoid_: recents, MRU, most-used, history rank.

### API surface

**Route wrapper**:
The server-side combinator (`workspaceRoute` / `storeRoute` / `authRoute`) that wraps an API handler with the shared request ceremony — linked-mode forwarding, cloud gating, context resolution, role gating, body validation, and error mapping — so a handler just receives a resolved context plus a parsed body and returns data (or throws an `HttpError`). The three variants differ only in which context they resolve; the depth lives in one shared core.
_Avoid_: middleware, guard, controller, handler (the handler is the thing being wrapped, not the wrapper).

### Cloud collaboration features

**Board**:
A saved dashboard of pinned queries rendered as live charts and tables against the real database.
_Avoid_: dashboard, report, canvas.

**Schedule**:
A query set to run on a fixed interval, with an alert rule that raises a notification when a value crosses a threshold.
_Avoid_: cron, job, task.
