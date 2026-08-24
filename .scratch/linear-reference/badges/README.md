# Linear reference — badges, labels, status, priority

Captured live from **linear.app** (workspace `moonssez`, team MOO) through the
t3 preview browser on 2026-08-24, then written down here so it is committed to
the repo and cannot be lost with a worktree again. Raw token values are in
[`linear-tokens.json`](./linear-tokens.json).

> Note: binary screenshots can't be written to disk from the t3 browser, so this
> reference is the extracted design tokens + the written spec below rather than
> PNGs. The earlier `.scratch/linear-attio-grade/` also holds `linear-app-css-vars.json`
> and two Linear screenshots.

## What Linear actually does

**Labels** — a pill: a small (~8px) solid colored dot + text. Pill is fully
rounded (`9999px`), ~20px tall, 11–12px text, weight 500, on a faint tinted or
transparent fill with a hairline. Color is drawn from a fixed hue family, never
arbitrary. The dot carries the color; the text stays near-neutral.

**Status** — an SVG glyph, not a filled pill. The glyph *shape* encodes the
state and color reinforces it:
- Backlog → dashed circle, neutral grey (`#6B6F76`)
- Todo → thin empty circle, neutral
- In Progress → circle with a partial pie fill, yellow-orange (hue ≈ 76)
- Done → filled circle with check, purple/blue (hue ≈ 282 / 270)
- Cancelled → filled circle with ×, muted grey

**Priority** — an SVG of three ascending bars:
- No priority → three faint bars
- Urgent → filled orange/red square with bars (`#F2994A` family)
- High → three bars, top-most filled
- Medium → two bars filled
- Low → one bar filled

**Count / number badges** — tiny rounded-full neutral pills with tabular digits.

## Design tokens that matter (match our foundation)

| Token | Linear value | Our foundation |
|---|---|---|
| Focus ring | `#5e69d1` | `--ring #5e69d1` ✓ |
| Control radius | `8px` | `--radius-control 8px` ✓ |
| Pill radius | `9999px` | `--radius-full` ✓ |
| Medium weight | `500` | `--weight-medium 500` ✓ |
| Body weight | `450` | `--weight-regular 450` ✓ |

## Rules to carry into Orbit

1. **Shape first, color second.** Status is legible by glyph even in greyscale;
   color only reinforces. Never rely on color alone (matches PRODUCT.md a11y).
2. **One hue family.** Semantic chroma (success/warning/danger/info/accent)
   comes from the intent tokens; decorative label colors come from a fixed
   palette, not free-form.
3. **Labels are dot + text**, not a saturated fill. Chroma is a 8px dot; the
   text stays in the neutral ink ramp.
4. **Quiet by default.** Metadata chips are hairline + muted; loud fills are
   reserved for meaning (prod env, destructive, urgent).
