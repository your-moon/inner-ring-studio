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

## How it's deployed

Prod is **grape-2** (`root@187.52.116.86`), served by Traefik at
`https://cloud.carrot-soft.tech`. The image is built *on the box* (no registry)
and runs a Next **standalone** bundle (bun build, `node server.js`).

**Primary path — CI/CD (push to `main`).** `.github/workflows/deploy.yml` runs
the jest suite on a GitHub-hosted runner, then, on green, a **self-hosted
GitHub Actions runner installed on grape-2** (systemd service
`actions.runner.your-moon-inner-ring-studio.grape-2`, label `grape-2`) syncs the
checkout into `/opt/inner-ring-cloud/app` and runs the same
`docker compose … up -d --build` locally, then health-checks the site. No
rsync-from-laptop, no registry, no inbound SSH. Docs-only pushes are skipped.
Watch a run: `gh run watch -R your-moon/inner-ring-studio`.

The **manual rsync + compose flow below** still works — it is the fallback (the
runner is down, or you're deploying an un-pushed local tree) and the basis for
rollback.

> The `npm run deploy` script (OpenNext → Cloudflare) is **not** the prod path
> and does not work here — it fails to bundle the inherited `runtime = "edge"`
> routes. Ignore it.

Layout on grape-2:

```
/opt/inner-ring-cloud/
├── app/                        # rsync'd repo source (image build context)
├── docker-compose.cloud.yml    # the stack (app + irs-cloud-db)
└── cloud.env                   # secrets, chmod 600 — NOT under app/, never synced
```

## First-time setup (on grape-2)

```bash
mkdir -p /opt/inner-ring-cloud && cd /opt/inner-ring-cloud
# Copy the compose file next to cloud.env (once):
#   deploy/docker-compose.cloud.yml -> /opt/inner-ring-cloud/docker-compose.cloud.yml

# 1. Create cloud.env (chmod 600) with strong secrets:
cat > cloud.env <<ENV
CLOUD_HOST=cloud.carrot-soft.tech
IRS_CLOUD_DB_PASSWORD=$(openssl rand -hex 24)
IRS_CLOUD_KEY=$(openssl rand -hex 32)
ENV
chmod 600 cloud.env
```

Then sync the source and build (same commands as an update — see below).

The schema (`users`, `connections`) is created automatically on first request
(`CREATE TABLE IF NOT EXISTS`). No migration step.

## Manual deploy (fallback)

Only when the CI/CD path is unavailable. Run from a clean checkout of `main`.
Two steps:

```bash
# 1. Push source up (from the repo root on your machine). The excludes keep
#    build caches, local secrets, and the dead Cloudflare artifacts off the box.
rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude '.swc' \
  --exclude '.scratch' --exclude '.open-next' --exclude 'cloud.env' \
  ./ grape-2:/opt/inner-ring-cloud/app/

# 2. Rebuild + restart on the box (bun install + next build run inside Docker,
#    ~2–4 min; the app container swaps once the new image is ready).
ssh grape-2 'cd /opt/inner-ring-cloud && \
  docker compose -f docker-compose.cloud.yml --env-file cloud.env up -d --build'
```

`--delete` mirrors the repo (removes stale files on the box); `cloud.env` lives
in the parent dir so it is never touched. Verify:

```bash
ssh grape-2 'docker ps --filter name=inner-ring-cloud --format "{{.Status}}"'
curl -sI https://cloud.carrot-soft.tech | head -1
```

### Rollback

`up --build` retags `inner-ring-studio:latest`, but the previous image is still
present by ID. To revert without a rebuild:

```bash
ssh grape-2 'docker images inner-ring-studio'          # find the prior image ID
ssh grape-2 'docker tag <PRIOR_ID> inner-ring-studio:latest && \
  cd /opt/inner-ring-cloud && \
  docker compose -f docker-compose.cloud.yml --env-file cloud.env up -d'
```

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
