# Attio/Linear-grade: gap report for Inner Ring Studio

**Date:** 2026-08-23
**Method:** Live inspection of Linear's shipped app CSS (632 custom properties pulled from `linear.app`'s app bundle via DevTools), Attio's shipped CSS and product UI, screenshots of both, side-by-side with IRS running locally (`localhost:3008/3010`, branch `t3code/7a99d8fa`), plus code-level verification of every behavioral claim. Primary-source research (Linear/Attio blogs, docs, talks) in [research-sources.md](research-sources.md). Screenshots in [shots/](shots/), raw Linear token dump in [linear-app-css-vars.json](linear-app-css-vars.json). Visual side-by-side: [visual-report.html](visual-report.html).

---

## Verdict

The shell already speaks the dialect — the primary is literally Linear's indigo (`#5e6ad2`), nav rows are 13px/500, radius is 8px, and `src/lib/motion.ts` is already modeled on Linear's curves. What separates IRS from Attio/Linear-grade is not the token sheet; it's five structural things:

1. **The grid — the product's soul — reads as a terminal, not a data surface.** Bold mono everywhere, full gridlines, inconsistent alignment, dead space, "Affected Rows: 50" for a SELECT.
2. **No surface hierarchy.** Sidebar, content, and panels are all the same white (same near-black in dark). Linear builds structure from background *levels*, not lines.
3. **The command palette doesn't exist where users live.** ⌘K works in the home shell and is a no-op inside the studio (verified live and in code — `command-palette.tsx` is mounted only in `(main)`).
4. **Two disconnected shells.** Home and studio are different applications visually (different sidebars, different nav idioms, a floating FAB in one), so opening a database feels like leaving the product.
5. **No environment awareness.** `prod-main` and `vms-dev` are pixel-identical rows. For a database tool this is a *safety* gap wearing a design costume.

Everything below is: observation → evidence → what Linear/Attio actually do (sourced) → concrete recommendation.

---

## What is already at grade (don't touch)

- **Accent and neutrals.** `--primary: #5e6ad2` (Linear's exact indigo), `--border: #e9e8ea`, `--muted: #f4f2f4`. Verified against Linear's shipped `#5e6ad2`/`#7170ff`.
- **Motion system.** `src/lib/motion.ts` — 140–220ms, ease-out-quad house curve, scale(.96) palette entrance. Matches Linear's shipped `--speed-quickTransition: .1s / .25s / .35s` and their easing suite. Extend it; don't rebuild it.
- **Row density where it counts.** Grid rows are 35px (`query-result-table.tsx:562`) — inside the Linear 36±4 band. The grid's heaviness is typographic, not dimensional (see F3).
- **Grid capabilities.** Inline cell editing with Enter-commit, virtualized rendering (`table-optimized/`), context-menu handler, saved views, query-history palette all exist. The *behaviors* are mostly there; the *presentation* betrays them.
- **Home-shell command palette** loads connections first so ⌘K searches them instantly (recent commit) — correct instinct, wrong scope (F4).

---

## Findings

### F1 — Surfaces: structure is drawn with lines, not felt through levels

**Observation.** IRS light mode: sidebar `#ffffff`, content `#ffffff`, separated by a 1px border. Dark mode: everything sits on the same `rgb(8,9,10)`. Panels distinguish themselves only by borders.

**What they do.** Linear's shipped app CSS: content base `#f9f9fa` light / `#121213` dark, sidebar **recessed** at `#efeff0` light / `#09090a` dark — the content area reads as an elevated sheet without a single shadow. Dark elevation runs `#08090a → #0f1011 → #141516 → #191a1b` as background levels, not box-shadows. Their 2026 refresh states the principle: *"Structure should be felt not seen."* Attio does the same with a cool LAB gray ramp and a 7-layer shadow scale that never exceeds 7% alpha.

**Recommendation.**
- Add surface tokens: `--surface-sidebar` (light `#f7f7f8`-ish, dark `#0b0c0d`), `--surface-base`, `--surface-raised`, and use them in `nav-layout.tsx` and the studio sidebar. Content panel gets the lighter/elevated value.
- Demote most internal borders: where a border currently separates same-level regions, either drop it (let the bg-level change do the work) or reduce to a hairline (`0.5px` on retina — Linear ships this).
- Keep shadows for floating layers only (menus, palette, dialogs), multi-layer at ≤7% alpha per layer.

### F2 — Two shells, two languages

**Observation.** The home shell (workspace switcher, search, WORKSPACE/MANAGE groups, bottom avatar) and the studio shell (icon-only left rail with four unlabeled icons, its own header, its own bottom avatar, a floating purple **+** FAB on "Tables") share almost nothing. Opening a connection is a hard context switch. The FAB is Material-idiom; neither Linear nor Attio ever floats a circular button over content.

**What they do.** Attio's app frame (visible in their hero shot): one persistent sidebar with workspace switcher + Quick Actions (⌘K), and the *view* changes inside a stable frame with a breadcrumb top bar (`Workflows › Smartflow`) and view tabs. Linear identically: one frame, contextual content. Karri Saarinen: purpose-built, opinionated — one navigation model, not two.

**Recommendation.**
- One shell. The studio renders inside the same frame: sidebar top = connection switcher (replacing workspace switcher context), then the table tree; top bar = breadcrumb `Connection › table / query-tab`.
- Kill the FAB; "new table / new query" belong in the sidebar header as a quiet `+` icon-button (as Attio/Linear do) and in ⌘K.
- Label the icon rail or remove it — four unlabeled icons is navigation debt. If the rail survives, add tooltips + single-key shortcuts (see F4).
- One avatar, one place (bottom of the unified sidebar).

### F3 — The grid: right bones, wrong skin

This is the highest-leverage set of changes in the report. Evidence: `shots/irs-grid-light.png` vs `shots/attio-product-table.png`.

| # | Observation (evidence) | What Attio/Linear do | Recommendation |
|---|---|---|---|
| 3.1 | **Every cell is bold mono** — `font-mono font-bold` in `query-result-table.tsx:115–126` and `table-optimized/index.tsx:134–148`. Text columns (`name`, `sku`) shout. | Attio: proportional Inter for text, tabular numerals for numbers. Linear pairs UI sans with mono *only* where alignment pays (IDs, code). | Text cells: Inter 13px weight 450, `--text-secondary`. Mono (keep) for: numerics, UUIDs, timestamps, NULL, JSON. Kill `font-bold` everywhere in cells; bold is for changed/dirty cells only. |
| 3.2 | **Full gridlines both axes**, header row with per-column dropdown chevrons always visible. | Attio: strong row separators, near-invisible column separators; header affordances appear on hover. | Row borders `--border` at 50% strength; column borders only on header + on column-resize hover. Chevron hidden until hover. |
| 3.3 | **Alignment inconsistent**: `price` left-aligned, `in_stock` right-aligned *and* link-blue for no reason. | Numbers right-aligned, tabular-nums, neutral ink; color = semantics only (Attio: blue means interactive). | Right-align all numerics via type metadata (already available from executors). Reserve blue for FK/links; add subtle FK jump affordance instead. |
| 3.4 | **No type identity in headers** — name + chevron only. | Attio headers: type icon + name (+ inline "+" to add a column at row end). | Add per-type icons (already have Phosphor set) at `--text-tertiary`; key icon for PK already exists — good. |
| 3.5 | **Grid stops dead** — huge empty region right of last column. | Attio stretches the frame; last col flexes, "+" column terminates the grid. | Flex last column to fill; in table-browse mode, terminal "+ add column" opens schema editor pre-focused. |
| 3.6 | **Footer: `Export` button + "Affected Rows: 50" + raw `50` / `0` inputs with arrows** (`result-stat.tsx:28`). Wrong term for a SELECT; pagination reads as a dev tool. | Attio footer: record count + per-column aggregates on selection. Linear: quiet status line. | Footer left: `50 rows · 23 ms` (query latency is a *feature* — show it). Selection: `Σ sum · avg · count` for numeric selection (nearly free in a DB client). Pagination: `‹ 1–50 ›` with page-size in a menu, not naked inputs. |
| 3.7 | **Toolbar**: `Add row / Delete row / Views / Import / Columns` all same weight, `Delete row` visible with nothing selected; filter input placeholder `eg: id=5`. | Attio/Linear: destructive + bulk actions appear *with selection* (Linear's ⌘K doubles as bulk-action surface); toolbars are quiet icon+label at 13px. | Contextual toolbar: default = `Filter`, `Columns`, `Views`, `+ Row`. On selection, a selection bar slides in (n selected · Delete · Export · Copy). `Delete row` never idles on screen. |

### F4 — Keyboard-first stops at the studio door

**Observation.** ⌘K opens the palette on home; inside the studio it does nothing (verified live; `command-palette.tsx` is imported only by `(main)/nav-layout.tsx`). The studio has a query-history palette and ⌘↵/format bindings in `query-tab.tsx`, but no global palette, no single-key map, no visible shortcut teaching.

**What they do.** Linear: ⌘K everywhere, one surface for navigation *and* actions, with per-row kbd hints that passively teach the shortcut system; single-key shortcuts for everything (`C` create, `O F` favorites); they ship a dedicated KBD component. Measured from their shipped CSS: palette 720px wide, 13vh from top, 46px input and rows.

**Recommendation.**
- Mount one palette at the root layout, context-aware: in-studio it ranks tables (frecency — you already have the zoxide-style ranker), saved queries, then actions (Run, Format, Export, Copy DDL, Switch connection, New tab). Home context ranks connections first (current behavior, kept).
- Adopt the measured spec: 720px / 13vh / 46px rows / group headings in `--text-tertiary` / kbd hint right-aligned per row. Entrance: existing `motion.ts` palette variant.
- Single-key layer inside studio: `t` focus table search, `⌘P` quick-open table, `⌘E` focus editor, `⌘J` toggle results panel, `j/k` row navigation, `⌘⇧C` copy row as JSON/INSERT/CSV. Render every hint with one `<Kbd>` component.
- Publish the map under `?` (shortcut overlay) — Linear's docs-grade discoverability without docs.

### F5 — Home: density, redundancy, and the missing safety rail

**Observation** (`shots/irs-home-populated.png`): connection rows ~88px in a flat list duplicating the sidebar's DATABASES tree; two search inputs (global `⌘K` + "Filter connections…"); two primary CTAs on one screen ("New connection" top-right, "Connect a database" in empty state — plus the studio FAB elsewhere); a gray dot per row with no legend; `prod-main` and `vms-dev` visually identical; "Cloud" badges on Scheduled/Boards adding noise.

**What they do.** Attio rows: ~40px, favicon/identity chip, dense metadata, no repeated CTAs. Linear: *"Don't compete for attention you haven't earned"* — one primary action per view. Both use color as meaning, never decoration.

**Recommendation.**
- Rows → 44px: identity dot (deterministic color from connection name), name, dialect chip, group, right-aligned `last used 2h ago` (frecency data exists). Status dot gets meaning: green = pool alive, gray = idle, red = last connect failed — with tooltip.
- **Environment badges as a first-class field**: `prod` renders an amber/red outline chip on the row, in the studio header, *and* drives behavior — write statements against a prod-tagged connection get a confirm step ("Run UPDATE on **prod-main**?"). This is the single cheapest trust-builder a DB GUI can ship.
- One primary CTA. Keep top-right "New connection"; the empty state's button becomes secondary style.
- Drop "Cloud" badges (communicate on hover or in settings); collapse the sidebar's flat duplicate — sidebar tree is nav, home list is content, they shouldn't compete.
- Home earns its keep by becoming *resume-first*: "Recent" section (last tables/queries across connections, frecency-ranked) above the full list, mirroring "Jump back into your work" copy that's already there.

### F6 — Feel: where instant needs to be visible

**Observation.** Editing commits per cell (Enter) — good. Row detail opens a centered dialog (`row-detail-dialog.tsx`). Query view stacks two empty states (editor placeholder + results placeholder saying almost the same thing). No visible query timing anywhere.

**What they do.** Linear: side *peek* panels preserve list context (SidePanel is a core component); mutations apply locally, sync later. Attio: "updates on the client without blocking on round trips"; footer aggregates; virtualize everything. For a DB client the honest boundary is the query round-trip itself — so *show* it.

**Recommendation.**
- Row detail → right-side peek panel over the grid (grid keeps scroll + selection); `↑/↓` walks rows while open; Esc closes. Dialog stays only for destructive confirms.
- Query lifecycle: on Run, results header immediately shows `Running · 0.4s` (live timer), then `50 rows · 231ms`. Long queries get a cancel affordance in the same spot. No skeletons over data you already have — keep stale results dimmed (there's already `loading-opacity.tsx`) with the timer running.
- Collapse the doubled empty state: editor placeholder stays; the results panel empty state reduces to one quiet line, or better, shows table-browse hints (`t` to jump to a table).
- All UI state local-first and instant: tab open/close/reorder, panel sizes, saved queries — never behind a spinner (mostly true today; audit any await on tab operations).

### F7 — Theming: adopt the 3-input model before adding more themes

**Observation.** `globals.css` carries hand-picked hex values per theme; dark mode is a parallel palette.

**What they do.** Linear rebuilt theming to generate *everything* from three inputs — base, accent, contrast — in LCH (*"perceptually uniform… equally light to the human eye"*), then derive surface levels, text ramps, borders by `color-mix(in lch, …)`. Attio ramps in `lab()`.

**Recommendation.** Not urgent, but do it *before* shipping user-configurable themes or more accent colors: define `--base`, `--accent`, `--contrast`; derive the 4-step text ramp, 3 surface levels, borders via `color-mix(in oklch, …)` (modern browsers; Electron fine). The current palette becomes the default seed, so nothing visibly changes on day one — you just stop maintaining N palettes by hand.

---

## Priority plan

| P | Change | Files (start here) | Effort |
|---|---|---|---|
| **P0** | Grid skin: kill bold-mono for text cells, alignment by type, soften gridlines, footer `n rows · ms`, contextual selection bar | `query-result-table.tsx`, `table-optimized/index.tsx`, `table-cell/*`, `result-stat.tsx` | 2–3 d |
| **P0** | Global ⌘K palette in studio (context-aware, frecency tables + actions, kbd hints) | `command-palette.tsx` → root layout, `quick-open.tsx`, `key-matcher` | 2 d |
| **P0** | Environment badges + prod write-confirm | connection schema, home rows, studio header, executor gate | 1–2 d |
| **P1** | Surface levels (recessed sidebar light+dark), hairline pass, remove FAB | `globals.css`, `nav-layout.tsx`, studio sidebar | 1–2 d |
| **P1** | Home density + Recent (frecency) section + single CTA + status-dot semantics | `(main)/page.tsx`, `local/page.tsx` | 1–2 d |
| **P2** | Unified shell (studio inside main frame, breadcrumb top bar) | `(main)` layout + `database-gui.tsx` | 3–5 d |
| **P2** | Row peek panel replacing dialog; query timer + cancel; empty-state collapse | `row-detail-dialog.tsx` → peek, `query-tab.tsx` | 2–3 d |
| **P3** | Footer aggregates on numeric selection (Σ/avg/count) | `result-stat.tsx`, selection state | 1 d |
| **P3** | LCH/OKLCH 3-input theme generation | `globals.css` | 2 d |
| **P3** | Shortcut overlay (`?`) + `<Kbd>` component everywhere | new `kbd.tsx`, docs overlay | 1 d |

**Process footnote (this is half of "Linear-grade"):** Linear maintains a zero-bugs SLA (fix in 48h/7d or close, no backlog) and a weekly papercut ritual (Quality Wednesdays, 1,000+ fixes). A biweekly 2-hour papercut pass on the grid alone would compound faster than any redesign. Their line worth pinning: *"the spec is the baseline, not the finish line."*

---

## Appendix: evidence artifacts

- `research-sources.md` — every principle above with its primary-source URL
- `linear-app-css-vars.json` — 632 custom properties from Linear's shipped app bundle
- `shots/attio-product-table.png` — Attio's grid anatomy (the DB-grid blueprint)
- `shots/attio-home-hero.png` — Attio's app frame (sidebar/breadcrumb/tabs model)
- `shots/linear-product-ui.png`, `shots/linear-login.png` — Linear app surfaces
- `shots/irs-home-populated.png`, `irs-studio-query-empty.png`, `irs-grid-light.png`, `irs-grid-dark.png`, `irs-cmdk.png` — IRS current state
- `visual-report.html` — annotated side-by-side of all of the above
