# Attio — Layout, Patterns & Tables (measured spec)

Ground-truthed live from `app.attio.com` (techpartners workspace, light theme,
1280×800). Numbers are real computed values, not guesses. Reproduce the **spec**
(measurements, colors, behavior) — never Attio's proprietary icons/assets.

Font everywhere: **Inter**. Primary action blue: **#266DF0**.

---

## 1. Layout system

```
┌ sidebar 272px ┬───────────── content (flex-1) ─────────────┐
│ (off-white)   │ view header        49px  · 12px x-padding   │
│               │ view toolbar       ~50px                    │
│               │ filter/sort bar    y≈112                    │
│               │ ───────────────────────────────────────────│
│               │ table scroller     starts y≈146, fills rest │
└───────────────┴─────────────────────────────────────────────┘
```

- Content sits directly right of the 272–275px sidebar; **1px left divider**, no
  floating panel/inset (flat Attio shell — already matched in our nav-layout).
- Content is white; sidebar is off-white. Header/toolbar/filter bars are
  **transparent** (inherit white), separated only by hairlines.
- Everything is a horizontal band stack; only the table region scrolls.

### Record page (row → record)
- Opened by clicking a row; URL is `/{ws}/company/{uuid}` (UUID, not slug).
- **Tab strip** in the header (`Overview`, `Activity`) — tabs 28px tall.
- Record title **16px / 600**.
- Two columns: **left detail rail ~320px** ("Record Details" fields) + wider
  right column for Overview/Activity feed.
- Field labels 14px, color #101112, ~77px label column then the value.

---

## 2. Interaction patterns

### Controls (toolbar buttons, chips)
- **28px** tall, **8px** radius, Inter.
- Primary = filled **#266DF0**. Secondary = white bg.
- View switcher (`All Companies ▾`) is a borderless dropdown trigger.

### Filter / sort chips (the view's query bar)
- **Ghost** style: bg `rgba(0,0,0,0.02)`, text + border `rgba(0,0,0,0.5)`.
- 28px, 8px radius. Quiet until active, then they solidify.

### Menus / popovers (View settings, Sort, column menus)
- Container: white, **12px radius** (`--radius-menu`), width ~270px.
- Elevation (the Attio menu shadow token):
  ```
  0 0 0 1px rgba(28,40,64,.04),
  0 4px 8px -4px rgba(28,40,64,.12),
  0 4px 12px -2px rgba(24,41,75,.16)
  ```
  = a hairline ring + two soft stacked drops. Not a hard border.
- Items: **14px** text, ~20px tall, small (4px) padding, **6px radius** hover
  highlight, label color `rgba(0,0,0,0.55)` (tertiary) → darkens on hover.

### Row / cell interaction
- Row hover → subtle highlight; click → open record.
- Sidebar highlights use black-alpha overlays (`rgba(0,0,0,0.04)`), not solid fills.

---

## 3. Table (the collection view)

The core object grammar. A "menu" like Companies = an object collection rendered
as a spreadsheet-style record table.

### Three-bar header
1. **View header** — object name (left) · Share / comments / help / Ask (right).
2. **View toolbar** — view switcher + View settings (left) · Import/Export +
   primary New (right).
3. **Filter/sort bar** — `Sorted by …` chip + `Filter` chip.

### Grid
| Part | Spec |
|---|---|
| Header row | **40px** tall, **12px** cell padding, 1px bottom border **#EEEFF1** |
| Columns | draggable-reorder + resizable, ~**180px** default (Description 288px) |
| Data rows | ~**36px** pitch, hover highlight, click → record |
| Row checkbox | **16px**, **6px** radius, border `rgba(0,0,0,0.09)`, white; select-all in header |
| First column | record identity as avatar + name **pill/link** (blue), pinned |
| Footer | `N count` + per-column **"Add calculation"** aggregations |

### Behaviors to reproduce
- Column drag-reorder + resize handles.
- Row-checkbox multi-select with a header select-all.
- Persistent per-view sort/filter chip bar (the query lives with the view).
- Footer column aggregations.
- Row-click opens the record (peek/full).

---

## Mapping to IRS

Our **DB table / data browser** is exactly this pattern. To make it Attio-grade:

- Three-bar header: table name → view switcher + view settings (left) / import +
  primary action (right) → ghost filter/sort chips.
- **40px sticky header, 36px rows, 16px/6px-radius checkbox**, `#EEEFF1`
  hairlines, resizable + draggable columns.
- First column = record identity pill/link; **row-click → record peek** with a
  ~320px left detail rail + Overview/Activity tabs.
- Footer: row count + column aggregations.
- Menus: reuse `--radius-menu` 12px + the Attio elevation token above; 14px items,
  6px-radius hover.
