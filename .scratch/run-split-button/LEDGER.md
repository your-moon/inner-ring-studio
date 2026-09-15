# Ship ledger — Run split-button fix

Target: https://cloud.carrot-soft.tech (cloud, auto-deploy from `main` via grape-2 runner)
Route approved: branch → PR → check.yaml → merge → auto-deploy → prod probe
Probe: `scripts/probe-split-button.mjs` (computed styles only)
Rollback: `git revert <sha> && git push`

## Rulings

| # | Decision | Why | Cost if wrong |
|---|---|---|---|
| 1 | Fix via a separate unlayered `split-button.css` imported after the crisp recipe, not `!important` utilities | Tailwind utilities are in `@layer utilities`; the crisp recipe is unlayered and always wins. Import order is the only lever that doesn't need `!important`. | Low — CSS-only; revert restores current (already-broken) look |
| 2 | Probe surface = `/playground/client`, not an authed query tab | Renders the identical split button unauthenticated with no interaction; no credentials or DB in the probe | Low — if the playground stops rendering it, probe fails loudly rather than silently passing |
| 3 | Reverted the subagent's `prettier --write` churn | The file was already prettier-dirty on `main`; the rewrite pulled unrelated reformatting into the diff | None — cosmetic only |
| 4 | Probe launches its own headless Chrome over CDP, zero new deps | Node 22.19 has a global WebSocket; avoids adding Playwright to a repo whose CI only runs jest | Low — script is self-contained and deletable |
