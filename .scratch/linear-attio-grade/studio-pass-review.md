# Review: "Studio workspace pass" (5d6db64)

**Scope:** the other agent's commit `5d6db64` (9 files, studio workspace). Reviewed three ways: full-diff code review (6 verification agents), live dogfood on this branch with a fresh vault + the sample Postgres (`localhost:5434/shop`), and design critique against the primary-source Attio/Linear research ([research-sources.md](research-sources.md)). Screenshots: `shots/pass2-*.png`.

## Verdict

**Do not deploy this commit as-is.** The direction is right and about half of it is genuinely good, but it ships one compile error (breaks `tsc --noEmit`, therefore any type-checked build), one visibly broken toolbar, and two behavioral regressions. The claim "verified the full query lifecycle" cannot have included looking at the table toolbar: the inspector toggle renders its entire tooltip sentence as a ~500px button label. Fix list below is a day of work; the feature underneath is worth keeping.

## What's genuinely good (keep)

- **Schema-first open.** Opening into tables instead of a connection switcher is the correct call, and matches the report's F2. Verified live: connection opens with `public` expanded, all tables visible.
- **The color sweep.** Every `neutral-*` → token change I checked is correct and consistent (`sidebar-tab`, `windows-tab`, filter pills, schema search). This is exactly the papercut work the report asked for.
- **Quieting the indigo panel titles** (`text-primary text-xl` → `text-[15px] font-semibold text-foreground`) — right move, right values.
- **Folder collapse with counts** — right feature, right visual (caret + count in tabular-nums).
- **Killing the "Unsaved Query /" breadcrumb** — right instinct (wrong mechanism, see B4).

## Broken (must fix before ship)

Confirmed by both code review and live browser:

| # | What | Evidence |
|---|---|---|
| B1 | **Compile error.** `variant="default"` doesn't exist on the orbit Button. `tsc --noEmit` fails at `table-data-tab.tsx(330,15)` — blocks any type-checked build. At runtime the "active" toggle matches no `btn-*` class, so the pressed state renders as nothing (confirmed live: toggling produces zero visual change on the button). | tsc output; `shots/pass2-inspector.png` |
| B2 | **Tooltip renders as button caption.** orbit Button consumes `title` as visible content (`{shape !== "square" && title}`), so the toolbar shows a giant button reading "Row inspector — view the focused row as a record", displacing every other control. | `shots/pass2-grid-toolbar.png` |
| B3 | **Studio's background vault sync is dead.** `ConnectionsSidebar` was the lazily-mounted default tab; its `useSWR("/api/db", {refreshInterval: 5000})` was the *only* poller on the studio page, and `GET /api/db` piggybacks the throttled git-vault pull (`scheduleBackgroundSync()`, `api/db/route.ts:73`). With Schema now default, a user who never clicks "Databases" gets no vault sync and no remote-change toast for the whole session. Fix: move the poll (or a dedicated `useSWR`) up into `DatabaseGui`/studio layout — sync shouldn't be a side effect of which sidebar tab is mounted anyway. | removed-behavior audit |
| B4 | **Breadcrumb suppressed by magic string.** `namespaceName !== "Unsaved Query"` — a real namespace the user names "Unsaved Query" is silently treated as unsaved, and rewording the fallback at line 162 resurrects the bug this commit fixed. Represent unsaved as absence (`string \| null`), not as a display-string match. | altitude finder |
| B5 | **Auto-expand can permanently self-disable, and leaks across connections.** (a) The persist effect writes `[]` on first mount; if the schema fetch is slow/fails/reloaded once, `hadPersistedTree` finds the self-written `[]` forever after and the headline feature never fires again for that connection. (b) `SchemaList` is reused across connection switches (no `key` on `<Studio>`): the refs stay stale, connection B renders A's expand state and the persist effect **overwrites B's saved state with A's keys**. (c) On SQLite-family (flattened schema), `topKeys` are table keys, so first open expands every trigger/FTS shadow-table group. The two-refs-plus-effect design is the root cause: make `collapsed` state `Set \| null` (null = never persisted → render expanded default), key it per connection, drop both refs. | line-by-line + cross-file + simplification finders |
| B6 | **⌘↵ hardcoded in the new empty state** while `KEY_BINDING.run.toString()` exists and is already imported in this file — Windows/Linux users are told to press a key they don't have, in the one UI whose job is teaching the shortcut. | altitude finder |

Worth fixing in the same pass (real but smaller): inspector shows **hidden columns** from saved views (iterates `getHeaders()` while the grid renders `visibleColumnIndexList`); phantom "Row N / all NULL" after discarding a focused new row (focus never revalidated against data length); re-render storm — the change listener force-renders all fields on every grid broadcast (~200/s during drag-select) with `JSON.stringify` of JSONB cells inline; blob cells render as `{"0":137,"1":80,…}` instead of going through `convertDatabaseValueToString` like every other cell in the app; `headerType()` probes two fields that don't exist on `TableHeaderMetadata` instead of typing the prop; folder-collapse persistence hand-rolls localStorage inside a setState updater instead of using `scopedStore` (impure updater, double-writes in StrictMode); folder collapse **unmounts** subtrees, discarding expanded tree state + fetched schemas on an accidental header click.

## Design critique — honest, against the research

The pass fixed chrome colors but didn't move the product toward the reference where it counts. Three of its four headline items are structural corrections (defaults, empty state, folding); only the inspector is new interface, and it's the weakest part of the pass as designed.

### R1 — Row inspector: right feature, wrong construction. REWORK.

Current: a 340px opaque overlay (`absolute z-10`) that covers the grid's rightmost columns — on exactly the wide tables it exists to serve, it hides data and steals their clicks. Header says "Row 42" (no identity). Everything inside is mono again, fields separated by full `divide-y` lines. No Esc, no ↑/↓, no edit.

**Steal: Linear's peek panel + Attio's record layout, wholesale.**
- **Panel mechanics (Linear `SidePanel`):** a layout sibling, not an overlay — third `ResizablePanel` in the existing group (`autoSaveId` persistence comes free; the grid virtualizer re-measures on resize). Enters with `motion.ts` slide (0.175s ease-out). `Esc` closes; `↑/↓` walk rows while open; grid keeps scroll + selection.
- **Record header (Attio):** the row's *identity*, not its index — PK value + first text column ("42 · Sprocket Max"), with a copy-row action (JSON / INSERT / CSV) in the header, right-aligned quiet icon.
- **Field rows (Attio record page):** field name in **proportional** Inter 12px `--text-tertiary`, type annotation right-aligned 11px mono `--text-quaternary`, value below in 13px — mono *only* for numerics/ids/timestamps/NULL/JSON. Separation by spacing (10–12px), no `divide-y` lines: "structure should be felt not seen."
- **Respect the view:** iterate the grid's visible columns, with a quiet "3 hidden fields" expander at the bottom for the rest.
- **NULL / dirty:** keep italic NULL; dirty cells get the same amber/dirty treatment as the grid (not `text-primary` — indigo means interactive in both reference systems, never "changed").

### R2 — Query empty state: fixed the void by duplicating the message. REWORK.

Current: editor placeholder says "Write SQL, then ⌘↵ to run"; the new results empty state says "Write a query above and press ⌘↵ to run it" plus "Or pick a table…". Same instruction twice on one screen, both hardcoded Mac-only.

**Steal: Linear's empty-state discipline** — one message per surface, teaching a shortcut through the `<Kbd>` system, not prose.
- Editor keeps its placeholder (that's where the eye is), rendered from `KEY_BINDING.run.toString()`.
- Results panel drops to a single quiet line, or better, earns its space: recent queries for this connection (frecency exists) as clickable rows — Linear never shows a static "how to use the product" card where resumable work could be.
- The whole guidance block belongs behind one shared `<Kbd>` component (report P3) so every hint in the app renders keys the same way and per-platform.

### R3 — Folder headers: correct pattern, two mechanical flaws. Adjust, don't rework.

Collapse-on-header matches Linear's sidebar sections. But (a) collapsing *unmounts* the subtree, so an accidental click destroys the user's expanded tree state — Linear collapses visually and keeps state; hide, don't unmount (or lift tree state out of the items). (b) Persistence should go through `scopedStore` and be keyed per vault, per the codebase's own convention.

### R4 — What the pass didn't touch (and claimed territory implies): the grid itself

The screenshots make it obvious: with the inspector's clean typography sitting next to the grid, the grid's `font-mono font-bold` everywhere now looks *worse* by contrast. The pass polished the chrome around the product's core surface and left the core surface as a terminal. Report P0 items (proportional text cells, alignment by type, soft gridlines, `50 rows · 23 ms` footer, selection-contextual Delete) are still the highest-leverage work in the codebase and none of it happened. The toolbar this commit touched still shows `Delete row` with nothing selected and a filter box whose UX is a placeholder string (`eg: id=5`).

### R5 — Ugly inventory (dogfood sweep, both his surfaces and pre-existing)

In priority order, each with the pattern to steal:

1. **Toolbar caption button** (B2) — after the fix, this should be an icon-only 28px ghost button with a real tooltip; active state = `bg-secondary` + `text-foreground` (Linear's toggle idiom), via the orbit Button's existing `toggled` prop that the commit ignored.
2. **Grid: bold mono everything, blue `in_stock`, left-aligned `price`** — Attio: proportional text, tabular-nums right-aligned numerics, chroma only for semantics. (Report 3.1/3.3.)
3. **"Affected Rows: 50" + naked `50`/`0` pagination inputs** — Linear status-line: `50 rows · 231 ms`, pager as `‹ 1–50 ›`. (Report 3.6.)
4. **Floating purple FAB on "Tables"** — neither reference floats buttons; quiet `+` icon in the panel header row. (Report F2 — untouched by the pass.)
5. **Size badge on every table row** — Attio shows metadata on hover/detail; per-row KB badges are noise at rest. Show on hover or move to a tooltip; keep the column quiet (`--text-quaternary`, no pill).
6. **Unlabeled icon rail** (4 mystery icons) — label on hover minimum, single-key shortcuts ideally; Linear never ships an unlabeled nav. (Report F2.)
7. **Doubled ⌘K teaching** — home sidebar has "Search… ⌘K" *and* the palette; studio has neither a palette nor any hint (report P0 #2 still open; ⌘K in the studio remains a no-op on this branch).
8. **New-connection form:** the "Paste a connection URL" field didn't parse a typed/filled URL in testing (only reacts to a real paste event) and silently ate the `postgres://` scheme; either parse on change/blur or say "paste only". Error surfacing is a raw sentence dropped between form sections (the PMSQL_PASSPHRASE error rendered as loose text, not attached to the action that failed — Attio attaches errors to the control, Linear toasts with an action).

## Ship recommendation

Hold the deploy. Order: B1/B2 (10 min), B3 (the silent regression — poll belongs to the studio shell), B5 (state model: `Set | null` + per-connection key), B4/B6 (30 min), then R1's panel mechanics (ResizablePanel + Esc/arrows + proportional field typography) so the inspector ships once, correctly, instead of twice. R2 collapses into the `<Kbd>` work. After that, this commit plus fixes is a genuinely good pass — but the grid skin (R4) is still where Attio-grade is won, and it remains untouched.
