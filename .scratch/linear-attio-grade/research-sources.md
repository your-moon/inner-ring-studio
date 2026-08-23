# Linear/Attio-grade: primary-source research

Research date: 2026-08-23. Every claim below traces to a primary source — Linear/Attio's own blogs, docs, careers pages, talks by their own people, or their actual shipped CSS (pulled from `linear.app` and `attio.com` production bundles on the research date). No secondhand think-pieces.

Method note: shipped-CSS tokens were extracted by downloading the live CSS bundles — Linear's from `https://static.linear.app/web/_next/static/css/*` (notably `index.CtQdVDoA.css`, `CommandMenu.DVY7V9_S.css`, `Button.dcAi4KbO.css`, `KBD.ByHmXOx_.css`), Attio's from `https://attio.com/_next/static/immutable/chunks/*.css`. These are the marketing sites, which share Linear's design-system tokens (`--color-bg-primary`, `--title-1`…, `--shadow-*`, theme switching via `[data-theme]`) — treat app-internal values as directionally identical but verify visually.

---

## 1. Linear's design language

### Redesign philosophy ("A design reset")

- Design debt is inevitable and compounds: "Each new capability adds stress on the product's existing surfaces for which it was initially designed." Successful products need a comprehensive design reset roughly every 2–3 years. — Karri Saarinen, [A design reset (part I)](https://linear.app/now/a-design-reset)
- Redesigns must be holistic, not module-by-module: "You cannot predict which path the user takes. If you update just one module or view at a time, the overall experience becomes more disjointed." — [same](https://linear.app/now/a-design-reset)
- "A real redesign can only happen when there is a reset on the design across the whole product. That's why I've never seen redesigns successfully executed without the CEO behind it." — [same](https://linear.app/now/a-design-reset)

### The 2024 UI redesign, part II (LCH theming, Inter Display)

Source: [How we redesigned the Linear UI (part Ⅱ)](https://linear.app/now/how-we-redesigned-the-linear-ui) — Andreas Eldh (eng) & Yann-Edern Gillet (design).

- Moved theme generation from HSL to **LCH**: "LCH has the benefit that it's perpetually uniform, meaning a red and a yellow color with lightness 50 will appear roughly equally light to the human eye." (Eldh)
- Collapsed "98 specific variables for each theme" down to **three inputs: base color, accent color, contrast** — every other color is derived. Contrast is a variable (range 30–100), which gets high-contrast accessibility themes for free.
- Light and dark themes use the same generator as custom themes, so design and eng "share the same language and iterate."
- Typography: switched headings to **Inter Display**, kept "regular Inter for the rest of the text elements" (Gillet).
- Contrast tuning: "making our text and neutral icons darker in light mode and lighter in dark mode"; limited chrome color for a "more neutral and timeless appearance" (Gillet).
- Invisible polish is deliberate: Gillet spent dedicated time "aligning labels, icons, and buttons, both vertically and horizontally in the sidebar and tabs" — work users "feel after a few minutes" rather than see.

### The 2026 refresh ("A calmer interface for a product in motion")

Source: [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh) — Charlie Aufmann & Maxime Heckel, Mar 2026.

- Framing: "Software rarely gets worse all at once. More often, it contorts out of shape one useful feature at a time." The refresh is restraint, not overhaul.
- Principle 1: **"Don't compete for attention you haven't earned"** — supporting chrome (sidebar, tabs, icons) recedes; content leads. Sidebar dimmed, tab bar made compact, icon count and sizes reduced, colored team-icon backgrounds removed.
- Principle 2: **"Structure should be felt not seen"** — borders/separators softened in contrast rather than multiplied.
- Palette shifted from cool blue-grays to **warmer grays**, "crisp, but less saturated."
- Process: internal dev toolbar with feature flags + an in-app color picker (built with Claude Code) to iterate on live UI.

### Linear Method (product-behavior principles)

Source: [linear.app/method — Introduction](https://linear.app/method/introduction).

- **"Build for the creators"** — tools should serve the people doing the work.
- **"Purpose-built"** — "Productivity software needs to be designed for purpose. It's the only way the product can truly do the heavy lifting." Opinionated > configurable.
- **"Create momentum – don't sprint"**; **"Aim for clarity"** ("Don't invent terms if possible"); **"Say no to busy work"** ("A tool should work for you, not the other way around"); **"Simple first, then powerful"** ("simple to get started with and grow more powerful as you scale").
- Homepage copy backs the same positioning: "Designed for speed — Reduces noise and restores momentum to help teams ship with high velocity and focus." — [linear.app](https://linear.app) (live homepage copy, 2026-08).

### Quality culture (the part that makes it *feel* Linear-grade)

- **Zero-bugs policy**: high-priority bugs fixed within 48h, low-priority within 7 days; no bug backlog exists — fix or "won't fix", "no third option." They cleared 175 open bugs in 3 weeks to start; fixed 2,000+ bugs in a year. "If the company was going to fix the bug eventually, it would have been so much better to fix it right away." — Tuomas Artman & Sabin Roman, [Why we committed to a zero-bugs policy](https://linear.app/now/zero-bugs-policy)
- **Quality Wednesdays**: weekly ritual of finding/fixing sub-bug "papercuts" that "degrade the overall experience"; most fixes ≤30 min; 1,000+ tracked quality fixes in 2 years. "The pursuit of quality is not an individual sport. It's hard to perceive subtle problems with a UI you yourself have built." — Tuomas Artman, [Quality Wednesdays](https://linear.app/now/quality-wednesdays)
- Linear runs a whole interview series on quality: "What is quality? … you can feel it when it's there." — [linear.app/quality](https://linear.app/quality)

### Karri Saarinen on craft and design engineering

- Karri's 10 rules (Config talk, published on Figma's blog): leadership must own quality; small teams aiming high; **"do away with handoff"**; "For quality, you need a team that views the spec as the baseline, not the finish line"; **"The best design is opinionated"**; "The simplest way to increase quality is to reduce scope"; "Quality is not perfection"; "Data can be a crutch … To provide the best experience, you must surprise users." — [Figma blog: Karri Saarinen's 10 Rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/); talk video: [Config 2025 — Crafting quality that endures](https://www.youtube.com/watch?v=pCil7YNhNCU)
- On design vs. code: "The most common reason design projects drag or fail is that the problem wasn't clear." Design happens before execution; "Once you start building designs directly to production as the default, the culture … to consider problems, concepts, and intentions start evaporating." — Karri Saarinen, [Design is more than code](https://linear.app/now/design-is-more-than-code); companion essay [Output isn't design](https://linear.app/now/output-isn-t-design)
- How Linear actually designs (Karri, first person): "The main point is that the design is only a reference, never any kind of deliverable itself … 1. We screenshot the app and design on top of it. 2. Simple design system that has mostly colors…" — [Karri on X](https://x.com/karrisaarinen/status/1715085201653805116)

### Speed / sync engine (why Linear feels instant)

- The sync engine is Linear's foundational speed mechanism. Primary sources are Tuomas Artman's own talks/posts: [Scaling the Linear Sync Engine](https://linear.app/now/scaling-the-linear-sync-engine) (blog + [talk video](https://www.youtube.com/watch?v=Wo2m3jaJixU), Jun 2023) — covers "the challenges we've had scaling the sync engine … and how the sync engine works in the Linear application today."
- Local-first architecture as UX: [Unexpected benefits of going local-first — Tuomas Artman, Local-First Conf 2024](https://www.youtube.com/watch?v=VLgmjzERT08) — local reads/writes mean interactions never block on the network; the server syncs after the fact (i.e. every mutation is optimistic by construction).
- Follow-ups: [Building a synchronous experience with asynchronous data](https://www.youtube.com/watch?v=bnOpm3a1fRE) (2025) and [Rebuilding Linear's delta sync read path](https://linear.app/now/rebuilding-delta-sync-read-path) (Peter Travers, Aug 2026 — catch-up latency across 20+ TB of sync actions).

---

## 2. Attio's design language

- Attio's own quality bar, in their own words (Senior Design Engineer role): they expect people to "interpret design systems, typography, spacing, animation, and layout to an exceptionally high standard," deliver "pixel-perfect experiences," and "care deeply about performance, accessibility, maintainability, and implementation quality." "We're obsessed about the details." — [Attio careers: Senior Design Engineer](https://attio.com/careers/senior-design-engineer-europe-remote)
- **Flexible data model** is the product's core structure: four components — **objects** ("think of an object as a table in a spreadsheet"), **attributes** ("describe what data we can store … text, number, select, or currency"), **records** ("the equivalent of a row in a spreadsheet"), **lists** ("composed of multiple rows, known as 'entries', each of which corresponds to a single record"; a list works with a single object type). — [Understanding Attio's data model](https://attio.com/help/reference/attio-101/attios-data-model/understanding-attio-data-model), [docs.attio.com Objects and lists](https://docs.attio.com/docs/objects-and-lists)
- **Table views = spreadsheet-grade grid with inline editing**: "Table views enable you to manage record and attribute data in a spreadsheet-style layout" — inline cell editing, per-view column labels (rename display without renaming the attribute), drag-to-reorder/resize columns, filter groups, sorts, relationship columns, and footer calculations (sum/count/avg) on numeric columns. Keyboard: arrow keys move across cells, Enter saves, Cmd/Ctrl+C/V copy-paste including bulk paste across selected cells. — [Create and manage table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views)
- **Engineering behind the feel**: Attio explicitly targets native-feeling responsiveness on the web — "updates on the client without blocking on round trips to the server, and supports offline syncing and real-time collaboration" (i.e. optimistic updates + sync, same family as Linear), on top of a "strongly-typed, relational data model, combined with the ability to store and make sense of large volumes of unstructured data." — Phil Beevers (VP Eng), [Where's the technical challenge in CRM anyway?](https://attio.com/engineering/blog/where-s-the-technical-challenge-in-crm-anyway-)
- **Virtualize everything**: they built and open-sourced React Data List for declaratively-composed virtualized lists — "It's made it easy to build virtualization into pretty much every screen, which has made a night and day difference to our app's performance." — Braden Marshall, [React Data List: Building virtualized UIs declaratively](https://attio.com/engineering/blog/react-data-list-building-virtualized-uis-declaratively)
- Engineering blog index (more primary material): [attio.com/engineering/blog](https://attio.com/engineering/blog).

---

## 3. Concrete design tokens from shipped CSS

### Linear (from `static.linear.app/web/_next/static/css/index.CtQdVDoA.css` and component CSS, fetched 2026-08-23)

**Font stacks** (verbatim):

- `--font-regular: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …`
- `--font-monospace: "Berkeley Mono", ui-monospace, "SF Mono", "Menlo", monospace`
- `--font-serif-display: "Tiempos Headline", ui-serif, Georgia, …` (marketing headlines)
- Font features on `html, body`: `font-feature-settings: "cv01", "ss03"` and `font-variation-settings: "opsz" auto` — Inter alternates (open digits/curved lowercase l) + auto optical sizing.

**Variable-font weights** (not the usual 400/500/600/700):

- `--font-weight-normal: 400`, `--font-weight-medium: 510`, `--font-weight-semibold: 590`, `--font-weight-bold: 680`, `--font-weight-light: 300`.

**Type scale** (UI text, rem @16px root):

- `--font-size-micro: .6875rem` (11px) · `mini: .75rem` (12px) · `small: .8125rem` (13px) · `regular: .9375rem` (**15px — the app's body size**) · `large: 1.125rem` (18px).
- Text styles: `--text-regular: 15px/1.6`, letter-spacing `-.011em`; `--text-small: 14px`, ls `-.013em`; `--text-mini: 13px/1.5`, ls `-.01em`; `--text-micro: 12px/1.4`; `--text-tiny: 10px/1.5`.
- Titles are all `semibold (590)` with tightening tracking as size grows: `--title-1: 17px/1.4, ls -.012em` up to `--title-9: 72px/1, ls -.022em`.

**Radius scale**: `--radius-4/6/8/12/16/24/32` (px, names = values), `--radius-rounded: 9999px`, `--radius-circle: 50%`. Buttons default to fully-rounded (`--button-corner-radius: var(--radius-rounded)`), square variant uses `--radius-4`. Command-menu dialog: `border-radius: 12px`; selected-row highlight: `8px`.

**Hairline borders**: `--border-hairline: 1px`, overridden to `.5px` on 2x displays (device-pixel-ratio media query).

**Shadows** (theme-scoped; note: **flat/none by default at root**, elevation is opt-in):

- Dark: `--shadow-low: 0 2px 4px #0000001a` · `medium: 0 4px 24px #0003` · `high: 0 7px 32px #00000059`.
- Light: `--shadow-tiny: 0 1px 1px #00000017` · `low: 0 1px 4px -1px #00000017` · `medium: 0 3px 12px #00000017` · `high: 0 7px 24px #0000000f`.
- `--shadow-stack-low`: a 5-layer micro-stack (e.g. light: `0 -1px 1px inset #0000001c, 0 8px 2px #0000, 0 5px 2px #00000003, 0 3px 2px #0000000a, 0 1px 1px #00000012, …`) — layered near-invisible shadows instead of one blurry one.

**Color structure** (dark theme `[data-theme=dark]`, the canonical Linear look):

- Backgrounds: `--color-bg-primary: #08090a` (near-black, slightly warm) · `secondary: #1c1c1f` · `tertiary: #232326` · `panel: #0f1011` · translucent: `#ffffff0d`.
- Elevation as background levels: `--color-bg-level-0: #08090a` → `level-1: #0f1011` → `level-2: #141516` → `level-3: #191a1b` (each level ~2–3% lighter; surfaces communicate depth by tint, not shadow).
- Borders: `--color-border-primary: #23252a` · `secondary: #34343a` · `tertiary: #3e3e44`; translucent variants `#ffffff0d` / `#ffffff14`.
- Text, 4 steps: `--color-text-primary: #f7f8f8` · `secondary: #d0d6e0` · `tertiary: #8a8f98` · `quaternary: #62666d`.
- Accent: `--color-accent: #7170ff`, `--color-brand-bg: #5e6ad2` (indigo); links `#828fff`; selection derived via `color-mix(in lch, var(--color-brand-bg), …)` — LCH mixing in production.
- Light theme mirrors it: bg `#fff/#f9f8f9/#f4f2f4`, text `#282a30/#3c4149/#6f6e77/#86848d`, borders `#e9e8ea/#e4e2e4/#dcdbdd`.
- Semantic hues kept minimal: blue `#4ea7fc`, red `#eb5757`, green `#27a644`, orange `#fc7840`, yellow `#f0bf00`, indigo `#5e6ad2`, teal `#00b8cc` (+ display-P3 override for blue on wide-gamut screens).

**Motion**: `--speed-quickTransition: .1s`, `--speed-regularTransition: .25s`; full easing library (`--ease-out-quad: cubic-bezier(.25,.46,.45,.94)`, `--ease-out-quint: cubic-bezier(.23,1,.32,1)`, etc.). Command menu animates in at `.175s ease-out-quad` from `scale(.96)`.

**Layout/system**: z-index ladder as tokens (`--layer-command-menu: 650` sits above popover 600, below dialog 700, tooltip 1100, context-menu 1200); custom scrollbars 6px (10px active) with translucent thumbs; `--focus-ring-outline: 2px solid var(--color-indigo)` (dark) / `#0006` (light); `--min-tap-size: 44px`; buttons: heights 24/32/40/44px, font 12–15px, padding 10–20px.

**Component evidence** (shipped CSS): `CommandMenu.css` — dialog max-width 720px, top 13vh, 46px input at 15px font, group headings 30px/12px/tertiary-color, rows 46px min-height at 13px font, per-row kbd hints (20px, 11px font, 3px radius, translucent border). `KBD.css` — dedicated keyboard-key component: 16–20px keys, 4px radius, `bg-quaternary` + 1px `border-primary`. The marketing site ships `SidePanel`, `Toast`, `Tooltip`, `ContextMenu` layers as first-class CSS. — all from `https://static.linear.app/web/_next/static/css/` (fetch the current hashed filenames from `view-source:linear.app`).

### Attio (from `attio.com/_next/static/immutable/chunks/*.css`, fetched 2026-08-23)

**Fonts**: `inter` (body), `interDisplay` (display), `tiemposText` (serif, editorial), `JetBrains Mono` (code) — all self-hosted with fallback metric fonts (`inter Fallback` etc.). Same Inter/Inter Display pairing as Linear; mono is JetBrains Mono vs Linear's Berkeley Mono.

**Color architecture — LAB-based neutral ramps, not gray-N**:

- A **white ramp** `--color-white-100: #fff` → `900: #b5bdc9` (cool, blue-tinted grays: `200 #fafafb`, `300 #f3f4f6`, `400 #edeff3`, `500 #e4e7ec`, `700 #d3d8df`, `800 #cad0d9`) and a **black ramp** `--color-black-0: #000` → `900: #a4adba` (`100 #1c1d1f`, `400 #2e3238`, `600 #505967`, `700 #6f7988`, `800 #8f99a8`).
- Every value is double-declared with a `lab()` equivalent behind `@supports (color: lab(…))` — perceptual color space in production, Attio's counterpart to Linear's LCH.
- Accent blue ramp: `--color-blue-500: #266df0` (primary), `450: #538bf3`, `400: #709ff5`, `600: #245bc2`; semantic: red `#ff5b59`, green `#0fc27b`, yellow `#f5b900`.
- Semantic aliasing layer on top: `--internal-color-primary-background: var(--color-white-100)`, `--internal-color-default-stroke: var(--color-white-700)`, `--internal-color-primary-foreground: var(--color-black-100)`, `--internal-color-link-foreground: var(--color-blue-500)`, `--internal-color-focus-ring: #266df04d` — i.e. **stroke (border) tokens are a first-class tier**, matching Attio's crisp-bordered look.

**Shadows — a 7-layer "attio-layer" elevation scale, extremely low opacity**:

- `--shadow-attio-layer-1: 0 1px 3px rgba(0,0,0,.01)` → `layer-2: 0 2px 4px -1px /.02` → `layer-3: 0 4px 8px -2px /.03` → `layer-4: 0 8px 16px -4px /.04` → `layer-5: 0 16px 32px -8px /.05` → `layer-6: 0 32px 64px -16px /.06` → `layer-7: 0 64px 128px -32px /.07`. Offsets/blur double per layer; alpha never exceeds 7%. Elevation = stacking several of these, not one heavy shadow.

**Radii/spacing** (Tailwind v4 theme layer): `--radius-xs: .125rem` (2px) → `sm 4px, md 6px, lg 8px, xl 12px, 2xl 16px, 3xl 20px`; base `--spacing: .25rem` (4px grid). Shipped border-radius usage clusters at 5–12px.

**Buttons**: full state matrices as tokens per variant — e.g. ghost: transparent → hover `white-300` → active `white-400`; outline: `white-100` bg + `white-800` border, hover darkens border to `black-700` (border, not bg, carries the hover) — from `2h8eq-_npw11u.css`.

**Motion**: navigation transitions `.1s var(--ease-out-cubic)`; tokenized z-index ladder (dialog 100/101, context menu 200–202).

---

## 4. Interaction/behavior patterns (each sourced)

- **Command palette as primary nav (⌘K)** — Linear: "use Cmd/Ctrl K to open the command bar and select the preferred action" on any selection; it's both navigation and bulk-action surface. — [Linear docs: Select issues](https://linear.app/docs/select-issues), [Linear docs: Search](https://linear.app/docs/search). Shipped CSS confirms the design (720px, 13vh from top, rows with per-command shortcut hints) — `CommandMenu.DVY7V9_S.css`.
- **Keyboard shortcuts for everything** — Linear docs assign single-key/chord shortcuts pervasively: `C` create issue, `Cmd/Ctrl B` board layout, `O then F` favorites, `M+R` relate issues, `Shift M` milestone. — [Creating issues](https://linear.app/docs/creating-issues), [Board layout](https://linear.app/docs/board-layout), [Favorites](https://linear.app/docs/favorites), [Issue relations](https://linear.app/docs/issue-relations). Linear even ships a dedicated `KBD` CSS component for rendering keys in-UI (`KBD.ByHmXOx_.css`).
- **Optimistic updates / local-first sync** — Linear: all data local, mutations applied locally then synced ([Scaling the Linear Sync Engine](https://linear.app/now/scaling-the-linear-sync-engine), [Local-First Conf talk](https://www.youtube.com/watch?v=VLgmjzERT08)). Attio: "updates on the client without blocking on round trips to the server, and supports offline syncing and real-time collaboration" ([Where's the technical challenge in CRM anyway?](https://attio.com/engineering/blog/where-s-the-technical-challenge-in-crm-anyway-)).
- **Inline editing in dense tables (Attio)** — spreadsheet-style grid, arrow-key cell navigation, Enter to commit, bulk paste, per-view column labels, footer aggregates. — [Attio: table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views).
- **Peek/side-panel over full navigation** — Linear ships `SidePanel`/`GlobalSidePanel` as core CSS components on even the marketing site (`SidePanel.CAzmaQlh.css`); the app pattern is detail-in-context rather than page swap. (Shipped-CSS evidence; app behavior is the well-known issue peek view.)
- **Contextual right-click menus** — both tokenize a context-menu z-index layer in production CSS (Linear `--layer-context-menu: 1200`, Attio `--context-menu-*-z-index: 200–202`) — context menus are first-class architecture, not an afterthought.
- **Chrome recedes, content leads** — "Don't compete for attention you haven't earned" / "Structure should be felt not seen." — [A calmer interface](https://linear.app/now/behind-the-latest-design-refresh).
- **Quality as ongoing ritual, not launch gate** — zero-bugs policy (48h/7d SLAs, no backlog) and Quality Wednesdays (weekly papercut hunts, 1,000+ fixes). — [Zero-bugs policy](https://linear.app/now/zero-bugs-policy), [Quality Wednesdays](https://linear.app/now/quality-wednesdays).
- **No handoff; design engineering as a role** — Karri: "do away with handoff"; "when everyone understands how designs are implemented, and shares responsibility for the result, we're far more likely to achieve high quality" ([Figma blog / Config talk](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/)). Attio hires design engineers expected to hold "typography, spacing, animation, and layout to an exceptionally high standard" ([careers page](https://attio.com/careers/senior-design-engineer-europe-remote)).
- **Virtualize every list** — Attio: "night and day difference to our app's performance." — [React Data List](https://attio.com/engineering/blog/react-data-list-building-virtualized-uis-declaratively).
- **Opinionated defaults over configuration** — "Purpose-built", "The best design is opinionated", "reduce scope to increase quality." — [Linear Method](https://linear.app/method/introduction), [10 rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/).

---

## 5. Applicability to Inner Ring Studio (database GUI)

- **Table grid = Attio's table view, literally.** A DB result grid is the same object as Attio's spreadsheet view: inline cell editing (arrow keys to move, Enter to commit, Esc to cancel), bulk paste, drag-resize/reorder columns, footer aggregates (COUNT/SUM/AVG on numeric columns — Attio ships this; for a DB client it's nearly free). Virtualize unconditionally (React Data List finding). Sources: [Attio table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views), [React Data List](https://attio.com/engineering/blog/react-data-list-building-virtualized-uis-declaratively).
- **Schema sidebar = Linear's dimmed nav.** Apply "don't compete for attention you haven't earned": the connection/schema tree should be tonally recessed (Linear dims sidebar bg toward `bg-primary`, drops icon color/size), while the query editor + grid carry contrast. Separators via bg-level shifts, not lines ("structure should be felt not seen"). Source: [A calmer interface](https://linear.app/now/behind-the-latest-design-refresh).
- **Connection switcher / table jump = ⌘K.** Linear's model: one palette that is both navigator (jump to any table/connection/saved query) and action surface (run query, export, copy DDL) and shows the keyboard shortcut inline per row, teaching the shortcut system passively. Concrete specs to copy: 720px wide, ~13vh from top, 46px input, 46px rows, group headings in tertiary text. Sources: [Linear docs](https://linear.app/docs/select-issues), `CommandMenu.DVY7V9_S.css`.
- **Row/table detail = peek side panel, not page nav.** Inspecting a row, index, or FK should open a side panel over the grid (Linear's SidePanel pattern), preserving grid scroll/selection state.
- **Optimistic UI has a natural DB-client analog**: UI state (tabs, layout, saved queries, connection metadata) should be local-first and instant; the honest boundary is the actual query round-trip — mirror Attio's "don't block the client on the server" for everything except query execution itself, and make execution latency visible (timer) rather than skeleton-hidden. Sources: [Attio eng blog](https://attio.com/engineering/blog/where-s-the-technical-challenge-in-crm-anyway-), [Linear sync engine](https://linear.app/now/scaling-the-linear-sync-engine).
- **Type system maps 1:1**: 15px `Inter Variable` body with weights 510/590, 13px for dense grid rows and menus, 11–12px for metadata (row counts, latency, types); Berkeley Mono/JetBrains Mono equivalents for SQL and cell values — Linear/Attio both pair a UI sans with a characterful mono, which a DB client uses far more heavily.
- **Color discipline for a data tool**: 4-step text hierarchy + bg-level elevation ramp + hairline borders; reserve chroma for semantics (Attio: blue = interactive, red/green/yellow = state) so data cell colors (NULL dimming, diff highlighting, type tinting) don't fight the chrome.
- **Process findings transfer whole**: zero-bugs SLA and a weekly papercut pass are product-agnostic; "spec is the baseline, not the finish line" and "reduce scope to increase quality" argue for fewer, deeper IRS features (grid + editor + palette at Attio-grade beats ten mediocre panels).

---

## 6. High-confidence tokens & principles (summary table)

| Token/Principle | Value | Source |
|---|---|---|
| Body font | `Inter Variable` (+ features `cv01, ss03`, `opsz auto`); headings Inter Display | Linear shipped CSS; [redesign pt II](https://linear.app/now/how-we-redesigned-the-linear-ui) |
| Mono font | Berkeley Mono (Linear) / JetBrains Mono (Attio) | shipped CSS, both |
| Font weights | 400 / 510 (medium) / 590 (semibold) / 680 (bold) — variable-font intermediates | Linear shipped CSS |
| UI type scale | 15px body · 13px dense rows/menus · 12px labels · 11px micro; line-height 1.4–1.6; ls −0.010 to −0.013em | Linear shipped CSS |
| Title tracking | −0.012em small titles → −0.022em large; all semibold(590) | Linear shipped CSS |
| Radius scale | 4/6/8/12/16/24px (Linear); 2/4/6/8/12/16/20px (Attio); pills for buttons (Linear) | shipped CSS, both |
| Border weight | 1px, 0.5px hairline on retina | Linear shipped CSS |
| Dark surfaces | `#08090a` base; elevation by bg-level `#0f1011 → #141516 → #191a1b` (not shadows) | Linear shipped CSS |
| Text hierarchy | 4 steps: `#f7f8f8 / #d0d6e0 / #8a8f98 / #62666d` (dark) | Linear shipped CSS |
| Light neutrals | Attio white ramp `#fff → #b5bdc9` (cool); Linear 2026 shifted to *warmer* grays | Attio shipped CSS; [calmer interface](https://linear.app/now/behind-the-latest-design-refresh) |
| Accent | Linear indigo `#5e6ad2`/`#7170ff`; Attio blue `#266df0` | shipped CSS, both |
| Perceptual color | LCH generation from 3 inputs (base/accent/contrast) — Linear; `lab()` ramps — Attio | [redesign pt II](https://linear.app/now/how-we-redesigned-the-linear-ui); Attio shipped CSS |
| Shadows | Multi-layer, ≤7% alpha (Attio 7-layer scale; Linear shadow-stack); flat by default | shipped CSS, both |
| Motion | 0.1s quick / 0.175–0.25s regular, ease-out cubic-beziers; palette enters at scale(.96) | shipped CSS, both |
| ⌘K palette | 720px / 13vh top / 46px rows / inline kbd hints; nav + actions in one surface | Linear CommandMenu CSS + [docs](https://linear.app/docs/select-issues) |
| Keyboard-first | Single-key + chord shortcuts for every action; render keys with a KBD component | [Linear docs](https://linear.app/docs/creating-issues); KBD CSS |
| Grid interaction | Inline edit, arrow-key cells, Enter commit, bulk paste, footer aggregates, virtualized | [Attio table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views); [React Data List](https://attio.com/engineering/blog/react-data-list-building-virtualized-uis-declaratively) |
| Chrome restraint | "Don't compete for attention you haven't earned"; "Structure should be felt not seen" | [calmer interface](https://linear.app/now/behind-the-latest-design-refresh) |
| Perceived speed | Local-first reads/writes; never block UI on the server | [sync engine](https://linear.app/now/scaling-the-linear-sync-engine); [Attio eng](https://attio.com/engineering/blog/where-s-the-technical-challenge-in-crm-anyway-) |
| Quality process | Zero-bug SLA (48h/7d, no backlog); weekly papercut ritual; no design→eng handoff | [zero-bugs](https://linear.app/now/zero-bugs-policy); [Quality Wednesdays](https://linear.app/now/quality-wednesdays); [10 rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/) |
| Product stance | Opinionated, purpose-built, "simple first, then powerful", reduce scope to raise quality | [Linear Method](https://linear.app/method/introduction) |
