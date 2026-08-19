# Inner Ring Studio — Cloud Mode (Phase 2) Design

Status: draft for review · 2026-08-19

## Goal

Let Inner Ring Studio run in three modes from one build, selected by a
`DEPLOY_MODE` env var:

- **desktop** — offline, no login, connections in a local encrypted vault file.
- **selfhosted** — one server, one app password, connections in the vault file.
- **cloud** — hosted, real user accounts, each user's connections isolated in a
  database. This is the new work.

Everything else (SQL editor, data grid, drivers, pagination, ClickHouse) is
shared and unchanged.

## Principle: two pluggable seams, nothing else forks

The three modes differ in exactly two behaviours. We put each behind an
interface; today's code becomes the "local" implementation, cloud adds a second.

### Seam 1 — AuthProvider

```ts
interface AuthContext { userId: string | null } // null == single-tenant

interface AuthProvider {
  // Resolve the caller from the request (cookie). Returns null when unauthorized.
  resolve(req: Request): Promise<AuthContext | null>;
}
```

- **local** (`selfhosted`/`desktop`): today's `auth.ts`. One password (or none in
  desktop). `resolve` returns `{ userId: null }` when the app password matches (or
  always, in desktop). This is the single-tenant case.
- **cloud**: email + password accounts. `resolve` verifies the HMAC session
  cookie and returns `{ userId }`.

`requireAuth()` becomes `requireAuth(req): Promise<AuthContext | Response>` —
returns the context on success, a 401 Response on failure. Every data route
already calls `requireAuth`; they now thread the returned `AuthContext` into the
connection store.

### Seam 2 — ConnectionStore

```ts
interface ConnectionStore {
  list(ctx: AuthContext): Promise<SafeConnection[]>;
  get(ctx: AuthContext, id: string): Promise<VaultConnection | undefined>;
  add(ctx: AuthContext, conn: NewConnection): Promise<SafeConnection>;
  update(ctx: AuthContext, id: string, patch: Partial<NewConnection>): Promise<SafeConnection | null>;
  remove(ctx: AuthContext, id: string): Promise<boolean>;
}
```

- **local**: wraps today's `vault.ts` (ignores `ctx.userId`, single tenant).
- **cloud**: rows in Postgres, every query scoped by `ctx.userId`. Passwords
  encrypted at rest (see Encryption).

A single factory picks the pair from `DEPLOY_MODE`:

```ts
// src/lib/mode.ts
export const MODE = process.env.DEPLOY_MODE ?? "selfhosted";
export function getAuthProvider(): AuthProvider { ... }
export function getConnectionStore(): ConnectionStore { ... }
```

`SafeConnection` / `VaultConnection` types are reused as-is, so the whole
existing API surface (`/api/connections`, `/api/db`, `/api/query`
`resolveConnection`) changes only in *where it reads connections from*, not its
shape. The New Connection form we just built works unchanged in cloud mode.

## Cloud data model (Postgres)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,           -- random id
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,              -- scrypt, salted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE connections (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  driver       TEXT NOT NULL,               -- 'postgres' | 'clickhouse'
  host         TEXT NOT NULL,
  port         INTEGER NOT NULL,
  database     TEXT,
  db_user      TEXT,
  password_enc TEXT,                        -- AES-256-GCM (iv:tag:ct), server key
  ssl          BOOLEAN NOT NULL DEFAULT false,
  read_only    BOOLEAN NOT NULL DEFAULT false,
  folder       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
```

**Deferred to v2 (designed for, not built):** `workspaces`, `workspace_members`
(roles), and a nullable `connections.workspace_id`. Adding these later is an
additive migration — no rewrite. v1: each account sees only its own connections.

Schema is created by an idempotent `ensureSchema()` run on first cloud request
(CREATE TABLE IF NOT EXISTS) — no migration tool for v1.

## Auth (cloud)

- **Signup**: `POST /api/auth/signup` `{email, password}` → create user
  (scrypt hash via Node `crypto`, reusing the vault's scrypt params), set session
  cookie. Reject duplicate email; enforce a minimum password length.
- **Login**: `POST /api/auth/login` in cloud mode verifies email+password against
  `users`, sets the cookie. (Local mode keeps today's single-password behaviour.)
- **Session cookie**: extend `auth.ts` — the HMAC-signed token carries
  `{ userId, exp }` instead of just `{ exp }`. Same Web Crypto HMAC, same signing
  key derivation, so tampering/rotation protections carry over. Reuse the login
  rate-limiter already in place.
- **Logout**: clears the cookie (unchanged).

## Encryption of connection passwords

- Server master key `IRS_CLOUD_KEY` (env, like `PMSQL_PASSPHRASE`); AES-256-GCM
  per row via a shared `src/lib/crypto.ts` (extracted from `vault.ts`, which
  already does exactly this).
- The server decrypts a connection's password only to open the DB pool for that
  user's query — the proxy model already used everywhere.
- Rationale for not deriving the key from the user's password: the server proxies
  queries while the user is authenticated by *cookie*, not an in-hand password, so
  it must decrypt without the password present. Documented tradeoff: a server
  compromise exposes stored DB passwords — identical to the vault's existing risk;
  mitigated by chmod-600 env, read-only prod connections, and (future) per-user
  KMS if warranted.

## API changes (small, mechanical)

- `requireAuth` → returns `AuthContext`; every data route passes it to the store.
- `/api/connections` GET/POST/PUT/DELETE → delegate to `getConnectionStore()`
  scoped by `ctx` (instead of calling `vault.ts` directly).
- `/api/query` `resolveConnection` → for a `connectionId`, fetch via the store
  scoped by `ctx` (so user A can never query user B's connection). Inline
  `{connection}` path (New Connection "Test") stays, but is allowed only for the
  authenticated caller.
- `/api/db` (pool status/test) → same store scoping.
- Pool registry key already includes host/db/user/ro — no cross-user pool bleed;
  add `userId` to the pool key in cloud mode for defence in depth.

## Hosting (grape-2)

- A dedicated `irs-cloud-db` Postgres container in the app's docker-compose
  (separate from the grape stack's Postgres — untouched), on the app's private
  network, no public port. Volume-backed.
- App env gains `DEPLOY_MODE=cloud`, `IRS_CLOUD_DB_URL`, `IRS_CLOUD_KEY`.
- The existing hosted instance (`db.carrot-soft.tech`) can stay `selfhosted`
  (single password, vault) OR flip to `cloud`; decide at rollout. Recommendation:
  stand up cloud on a separate hostname first, keep the current instance as-is
  until cloud is proven.

## Testing

- Unit: cloud `ConnectionStore` (CRUD + `user_id` isolation — user A cannot read
  B's rows), password encrypt/decrypt round-trip, signup/login/session-with-userId
  verify + cross-user token rejection, mode factory selection.
- Integration (against the sample DB / a throwaway cloud DB): a second user's
  connection is invisible and unqueryable to the first.
- Reuse the existing Playwright harness for the cloud signup→add-connection→browse
  flow.

## Rollout / migration

- No data migration: cloud starts empty; the existing self-hosted vault instance
  is unaffected (different mode). Desktop unaffected.
- Ship behind `DEPLOY_MODE=cloud` on a new hostname; leave everything else as-is.

## Out of scope (v1)

Shared workspaces, team roles/permissions, invites, billing, SSO, email
verification / password reset (add after v1; the model already anticipates
workspaces).

## Open questions for review

1. Cloud on a **new hostname** (recommended) vs flipping `db.carrot-soft.tech`?
2. Any need for **email verification** in v1, or defer (recommended defer)?
