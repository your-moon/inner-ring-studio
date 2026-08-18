# Inner Ring Studio

A fast, self-hosted **database workspace** for your own PostgreSQL — a "better
online DBeaver with Airtable-style UX." Browse and edit data in a modern grid,
run SQL, and keep your connections in an **encrypted, git-synced vault**. Runs
**hosted** (web) or **fully offline** (desktop / local).

> A fork of [Outerbase Studio](https://github.com/outerbase/studio) (AGPL-3.0),
> re-focused on self-hosted PostgreSQL with a CLI, encrypted vault, and
> app-level auth. See [NOTICE](NOTICE) and [LICENSE](LICENSE).

## Features

- **Connect to your own PostgreSQL** — schema browser, editable data grid,
  SQL editor with results.
- **Safe write-back** — inline edits become parameterized `UPDATE … WHERE <pk>`
  in a transaction; composite PKs supported; no-PK tables read-only; injection-safe.
- **Read-only mode** per connection — enforced by Postgres
  (`default_transaction_read_only`), so a protected connection cannot be written to.
- **Encrypted vault** — connections stored AES-256-GCM encrypted; unlocked by a
  passphrase. **Git-backed config** syncs it across devices (any git provider), or
  use a synced folder (Drive/OneDrive/Dropbox). Configure from the CLI or the
  **Vault storage** settings page.
- **Connection manager** — live pool status, retry/disconnect, inline active
  badges + right-click menu in the sidebar.
- **Folders** for organizing connections; **cross-connection navigator** in the
  studio sidebar.
- **Query history** with zoxide-style frecency ranking; SQL editor content
  persists across reloads.
- **Ask AI** — generate SQL from natural language via the Claude CLI
  (`claude -p`), using your Claude subscription (no API key).
- **App-level login** for hosted deployments; timestamps rendered in local time;
  jsonb rendered as readable text.

## CLI (`pmsql`)

```bash
export PMSQL_PASSPHRASE='…'                 # or you'll be prompted
pmsql conn add prod --host … --port … --db … --user … [--read-only] [--folder …]
pmsql conn ls
pmsql conn set prod --read-only             # edit a connection
pmsql conn rm prod
pmsql serve --port 3008                     # launch the web UI
pmsql config link <git-repo-url>            # store the vault in a git repo
pmsql sync                                  # pull + push the vault
pmsql passphrase change                     # rotate the vault passphrase
```

Run in dev: `bun run src/cli/pmsql.ts <args>` (this repo uses **Bun**).

## Architecture

- **Web (hosted):** browser → Next.js server → `node-postgres` → your DB. The
  server holds the encrypted vault and the connection pools; the browser never
  touches the DB (browsers can't open raw TCP to Postgres).
- **Desktop / local:** the same server runs on your machine (loopback); the DB is
  reached directly from your machine, nothing leaves it. See
  [inner-ring-studio-desktop](https://github.com/your-moon/inner-ring-studio-desktop).

Key env: `PMSQL_PASSPHRASE` (vault), `PMSQL_VAULT` (vault path), `PMSQL_TZ`
(session timezone), `PMSQL_AUTH_PASSWORD` (enables app login when set).

## Develop

```bash
bun install
bun run dev            # http://localhost:3008
bun run build          # production standalone build
```

## Deploy (hosted)

Build the standalone image (`Dockerfile`) and run behind a reverse proxy with TLS.
Set `PMSQL_AUTH_PASSWORD` (login), `PMSQL_PASSPHRASE`, `PMSQL_TZ`, and mount the
vault. The reference deployment runs as a container behind Traefik.
