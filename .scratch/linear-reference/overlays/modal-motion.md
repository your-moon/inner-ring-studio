# Linear reference — modal / overlay motion

Inspected live from linear.app (create-issue modal) via the t3 browser, 2026-08-24.

## Real values pulled from Linear's modal card

- **Radius:** `22px` on the create modal card (large).
- **Shadow:** `0 4px 40px rgba(0,0,0,0.10)` + a second faint `0 3px …` layer —
  soft, wide, low-opacity.
- **Background:** `lch(9.232 0.85 272)` (near-panel dark).
- **Persistent transitions on the card:**
  `max-width 0.22s cubic-bezier(0.43, 0.07, 0.59, 0.94)`,
  `background-color 0.1s cubic-bezier(0.43, 0.07, 0.59, 0.94)`
  (these are for resize/theme, not the entrance).
- **Entrance:** fast and restrained — the card itself carries **no scale/slide**;
  entrance reads as a ~0.1s fade on a wrapper (ease-out). No poppy zoom.

## What this told us about our glitch

Our Dialog "glitched" because:
1. The arbitrary `animate-[…]` classes never set `animation-fill-mode`, so the
   element painted one frame at its final state before the keyframe's first
   frame → a flash. Fixed by appending `both` to every overlay animation.
2. `scale(0.96)` was far poppier than Linear's near-none entrance. Softened to
   `scale(0.98)` to match Linear's restraint.

Our result: fade + subtle scale(0.98) from center, 175ms, house ease-out,
fill-mode both. Sheets slide on ease-in-out-cubic. See globals.css `orbit-*`
keyframes and the overlay components.
