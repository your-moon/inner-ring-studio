# Deploying Inner Ring Studio — Cloud Mode

Multi-tenant hosted mode: real accounts, each user's connections isolated in a
dedicated Postgres (DB passwords encrypted at rest). Runs **alongside** the
existing self-hosted `db.carrot-soft.tech` and the grape stack — nothing shared,
nothing disturbed.

## What differs from self-hosted

| | self-hosted (today) | cloud |
|---|---|---|
| `DEPLOY_MODE` | `selfhosted` (default) | `cloud` |
| Login | one app password (`PMSQL_AUTH_PASSWORD`) | accounts (email + password), signup at `/signup` |
| Connections | encrypted vault file | `connections` rows in `irs-cloud-db`, per user |
| Extra env | `PMSQL_PASSPHRASE`, `PMSQL_VAULT` | `IRS_CLOUD_DB_URL`, `IRS_CLOUD_KEY` |

The same build serves all modes; the mode is chosen by `DEPLOY_MODE` at runtime.

## Prerequisites

1. **A hostname** pointing at grape-2, e.g. `cloud.carrot-soft.tech` — add a DNS
   A record → grape-2's IP (same as `db.carrot-soft.tech`). Traefik issues the
   cert automatically on first request.

## Steps (on grape-2)

```bash
mkdir -p /opt/inner-ring-cloud && cd /opt/inner-ring-cloud
# sync this repo to ./app (same as the self-hosted deploy), and copy:
#   deploy/docker-compose.cloud.yml -> ./docker-compose.cloud.yml

# 1. Create cloud.env (chmod 600) with strong secrets:
cat > cloud.env <<ENV
CLOUD_HOST=cloud.carrot-soft.tech
IRS_CLOUD_DB_PASSWORD=$(openssl rand -hex 24)
IRS_CLOUD_KEY=$(openssl rand -hex 32)
ENV
chmod 600 cloud.env

# 2. Bring it up
docker compose -f docker-compose.cloud.yml --env-file cloud.env up -d --build
```

The schema (`users`, `connections`) is created automatically on first request
(`CREATE TABLE IF NOT EXISTS`). No migration step.

## Verify

- Visit `https://cloud.carrot-soft.tech` → redirected to `/login` → "Sign up".
- Create an account, add a connection (New Connection form), browse.
- A second account sees none of the first account's connections.

## Secrets — do not lose these

- `IRS_CLOUD_KEY` decrypts every stored DB password. **Back it up.** Losing it
  makes all stored connection passwords unrecoverable (users just re-enter them).
- `IRS_CLOUD_DB_PASSWORD` is the cloud Postgres superuser password.
- Keep `cloud.env` at chmod 600. Never commit it.

## Notes

- The cloud Postgres has **no published port** — only the app container reaches
  it over the private `irs-cloud` network.
- Back up the `irs-cloud-db-data` volume (it holds all accounts + connections).
- To rotate `IRS_CLOUD_KEY` you must re-encrypt existing rows (not yet
  automated) — pick a strong key up front and keep it.

## v1 scope / not yet built

Shared workspaces, team roles, invites, billing, email verification, and
password reset are deferred (the schema is designed to add workspaces without a
rewrite). v1 = accounts + isolated per-user connections.
