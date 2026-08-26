#!/usr/bin/env bash
# Sync the crisp design system into this repo.
#
# crisp lives at ~/crisp (github.com/your-moon/crisp). After changing tokens or
# recipes there, run its generate pipeline, then this script re-packs the css
# and react packages into vendor/crisp/ and reinstalls. Tarballs are committed,
# so prod Docker builds (bun install --frozen-lockfile) need no registry.
set -euo pipefail

CRISP="${CRISP_DIR:-$HOME/crisp}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ generating crisp artifacts"
(cd "$CRISP" && bun rootage:generate && bun qvism:generate >/dev/null)

echo "→ building react package"
(cd "$CRISP" && bun --filter @seed-design/react build >/dev/null)

echo "→ packing into vendor/crisp"
rm -f "$REPO"/vendor/crisp/seed-design-*.tgz
(cd "$CRISP/packages/css" && npm pack --pack-destination "$REPO/vendor/crisp" >/dev/null)
(cd "$CRISP/packages/react" && npm pack --pack-destination "$REPO/vendor/crisp" >/dev/null)
ls -1 "$REPO"/vendor/crisp/

echo "→ reinstalling (npm + bun lockfiles)"
(cd "$REPO" && npm install --no-audit --no-fund >/dev/null && bun install >/dev/null)
echo "done. If the packed version changed, update the file: paths in package.json."
