# Linear reference — filter bar, view tabs, pickers

Captured live from linear.app (moonssez / team MOO issues view) via the t3
browser, 2026-08-24. Computed-style values, committed as ground truth.

## Add-filter button (the "+ Filter" pill)
- height **28px**, font **12px**, radius **9999px** (full pill)
- bg subtle `lch(10.149 0.689 272)` (~surface-selected), text `lch(90.451 1.2 272)` (~content-secondary)
- border `0.5px` transparent (appears on hover)

## Filter field menu (opens from the pill)
Fields, in order: **Status, Assignee, Priority, Labels**, Creator, Agent,
Dates, Relations, Project, Content, Links, Template… Each with a `▶` submenu
(operator/value). Rendered in a standard popover menu.

## View tabs (Active / Backlog / All issues)
- height **28px**, font **12px**, weight **500**
- inactive `lch(61.803 1.2 272)` (~content-tertiary); active goes to primary
  ink with an accent underline.

## Display options popover
Button aria-label "Display options". Contents (from Linear): Grouping,
Ordering, Sub-issues toggle, Show empty groups, and a properties list.

## Status / priority / label pickers
Rows are the glyph/dot + name (see ../badges/ for the exact status hue family,
priority bars, and label palette already captured). Selecting sets the value;
the picker is a searchable menu.

## What we build from this
FilterChip, AppliedFilters, FilterBuilder (pill → field menu → operator/value),
DisplayOptions, StatusPicker, PriorityPicker, LabelPicker, AvatarGroup,
DatePicker, ViewTabs — all on Orbit tokens (menu radius 10px, pill radius full,
12–13px text, house motion).

## Backfill reconciliation (2026-08-24)
Cross-checked our primitives against Linear's live values:
- Filter/Add pill: 28px / 12px / radius 9999px — **matches exactly**.
- View tabs: Linear 28px; ours were 32px → **fixed to 28px**.
- Menu/popover radius: Linear **12px**; ours was 10px → **bumped --radius-menu to 12px** (aligns Popover, Dropdown, Context, Select, Combobox, HoverCard, pickers).
- Menu item: Linear 13px / ~31px tall; ours 13px / 28px — within range, kept.
- Menu shadow: Linear `0 3px 8px lch(0 0 0/.125)` (soft) — ours (--shadow-menu 0 8px 24px) is comparable.
- Modal card: Linear create-modal 22px radius; ours --radius-modal 16px — intentional (Linear's confirm dialogs are smaller); left as-is.
- Focus ring #5e69d1, control radius 8px, weights 450/500 — already match.
