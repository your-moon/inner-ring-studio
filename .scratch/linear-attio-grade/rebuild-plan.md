# Rebuild plan: Attio/Linear-grade component kit, shell, and surfaces

**Gate:** nothing below starts until the two visual mocks are approved:
`mock-home.html` (home + workspace redesign) and `mock-studio.html` (studio
shell + core features). They are the north star; every phase implements a piece
of them. Sources for every number: [research-sources.md](research-sources.md)
and Linear's shipped app CSS ([linear-app-css-vars.json](linear-app-css-vars.json)).

Already shipped on this branch (kept, not redone): grid skin, studio ⌘K
palette, row peek panel, quiet footer, sidebar surface token, Kbd component,
motion tokens (`src/lib/motion.ts`), the studio-pass fixes.

---

## Phase 0 — Foundations (theme, type, motion) · ~1.5 d

**Theme.** Move `globals.css` to the measured Linear model:
- Light: app canvas `#f9f9fa`, sidebar `#efeff0`-family, elevated sheets/cards
  `#ffffff`. Dark: sidebar `#09090a`, canvas `#121213`, sheets `#17181a`,
  elevation by background level, never shadow. 4-step text ramp both themes
  (dark: `#f7f8f8 / #d0d6e0 / #8a8f98 / #62666d`).
- Accent `#5e6ad2` light / `#7170ff` dark (already ours). Semantic set: green
  (live/success), amber (prod/dirty), red (destructive) — chroma only as
  meaning.
- Derive ramps with `color-mix(in oklch, …)` from three inputs (base, accent,
  contrast) so future themes are generated, not hand-picked.

**Type.** Inter with `cv01, ss03` features; scale 15 (content) / 13 (UI) /
12 (labels) / 11 (micro); weights 450/510/590 (variable-font intermediates —
verify the bundled Inter is the variable cut, else ship it). Tabular numerals
everywhere data appears.

**Motion.** `motion.ts` is already Linear-modeled; add the CSS side
(`--speed-quick .1s / --speed-regular .25s`, ease-out suite) and use it for all
chrome transitions. Rules: transform+opacity only, 80–175ms, ease-out, no
bounce.

## Phase 1 — Component kit (orbit v2) · ~3 d

Rebuild in place (`src/components/orbit/`), one PR-sized commit per component,
each with a `/storybook` page (the in-repo MDX gallery) showing all states ×
both themes, and jest tests for any logic. Replace call sites as each lands.

| Component | Spec (from research) | Notes |
|---|---|---|
| Button | 28px sm / 32px base; secondary = hairline border on sheet; primary = accent; ghost; destructive = red text until hover | kills today's mixed ui/orbit duo — one Button |
| IconButton | 28px square ghost, tooltip required | replaces ad-hoc icon buttons |
| Input / Search | 32px, bg-sheet, hairline, focus ring `--ring` 1px | one input, not three variants |
| Select / Menu / ContextMenu | popover sheet on `--popover`, 6px radius items, 13px | Radix under the hood (kept) |
| Tabs (window + view) | quiet strip on canvas, active = sheet + text-primary, 32px | windows-tab restyle |
| Chip / Badge | dialect chip, env badge (amber outline `prod`), count badge | new |
| StatusDot | green live / gray idle / red failed + tooltip | new, used home + tree |
| Kbd | shipped | extend usage everywhere hints appear |
| Dialog / Confirm | 460px sheet, Linear shadow stack, scale .96 enter | common-dialog restyle |
| Peek panel | shipped (row inspector) | restyle to kit tokens when kit lands |
| Toast | bottom-right, quiet, action slot | sonner restyle |
| EmptyState | icon-less one-liner + optional Kbd, never a card | shipped pattern, make component |
| Skeleton/loading | dim + hold layout, no spinners over data | replace OpacityLoading look |

## Phase 2 — Shell unification · ~3 d

One persistent shell for home and studio (mock shows it): recessed sidebar
(workspace/vault switcher → ⌘K search → DATABASES tree with status dots + env
badges → WORKSPACE → MANAGE → avatar row), content as elevated sheet with a
breadcrumb top bar (`Shop (sample) › products`). The studio's unlabeled icon
rail dissolves into the tree + tabs. `?` opens a shortcut overlay; single-key
map (`t` tables, `⌘K`, `⌘T/W/1-9` exist).

## Phase 3 — Home & workspaces redesign · ~2 d

Per mock-home: resume-first ("Continue" = frecency-ranked recent tables/queries
across connections), dense 44px connection rows (identity dot · name · dialect
chip · env badge · host · last-used · status dot), one primary CTA, cloud
features (Scheduled/Boards) as quiet rows not badge-noise. Workspace pages get
the same sheet + section grammar.

## Phase 4 — Core features to grade · ~3 d

- Per-column filter UI: `+ Filter` chip-builder (column → operator → value)
  replacing the `eg: id=5` box; chips already render.
- Env write-gate: confirm dialog (with SQL preview) before any write statement
  or commit against `environment: production` (vault field shipped; gate lives
  in Studio's query proxy; `write-detect` lib + tests).
- Selection bar: n selected · Delete · Export · Copy (floating, per mock).
- Query lifecycle: live `Running · 0.4s` timer + cancel in the results header.
- Timestamps humanized in grid (full precision on hover/inspector).

## Phase 5 — Motion + polish pass · ~1 d

Route/panel/list entrances from `motion.ts` variants; hover/focus at
`--speed-quick`; palette/dialog scale-in; a papercut sweep with the critique
checklist. Lighthouse + axe pass on home and studio.

## Testing

- jest: state models (tree collapse, selection), fuzzy rank, write-detect,
  pagination, value formatting — logic only, every new lib file ships with its
  test (repo convention already: 43 suites).
- /storybook: every kit component, all states × light+dark — the visual
  regression surface (screenshot in CI later if wanted).
- e2e (existing playwright infra on CI runners): smoke — open connection,
  browse table, edit cell, run query, ⌘K jump.

## Order & gates

0 → 1 → 2 → 3 → 4 → 5; visual check against the mocks at the end of each
phase (screenshots into `.scratch/linear-attio-grade/shots/`). Mocks approved
first; anything the mocks don't answer gets decided by the research doc, not
taste-in-the-moment.
