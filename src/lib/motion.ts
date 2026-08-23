/**
 * The motion system — one place every animation pulls from, so the whole app
 * moves as a single language. Modeled on Linear/Attio: fast, ease-out, no
 * bounce, transform + opacity only (never animate layout).
 *
 * Durations are deliberately short. Chrome (hover, selection, focus) is CSS and
 * lives in globals.css as `--motion-*`; this module is for the JS-driven
 * entrances/exits that CSS can't express (command menu, route, staggered lists).
 */
import type { Transition, Variants } from "framer-motion";

// Easing curves (cubic-bezier control points), lifted from production CSS.
// `EASE_OUT` is Linear's house curve (ease-out-quad) — the workhorse.
// `EASE_EMPHASIZED` is Attio's calm color-fade; `EASE_IN_OUT_CUBIC` for slides.
export const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const; // Linear house
export const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const; // Attio calm
export const EASE_IN_OUT_CUBIC = [0.65, 0, 0.35, 1] as const;

// Durations (seconds). Linear lands nearly everything in 80–175ms.
export const DUR = {
  fast: 0.14,
  base: 0.175, // menu / dialog
  slow: 0.22,
  slower: 0.3,
} as const;

export const transition = {
  fast: { duration: DUR.fast, ease: EASE_OUT },
  base: { duration: DUR.base, ease: EASE_OUT },
  slow: { duration: DUR.slow, ease: EASE_OUT },
} satisfies Record<string, Transition>;

/** Backdrop / overlay: pure fade. */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.fast, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Command menu / dialog: scale in from 0.96, fade. This is the Linear Cmd+K
 *  feel — 175ms ease-out-quad, a small confident pop, never a bounce. */
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.11, ease: EASE_OUT },
  },
};

/** A staggered list: parent orchestrates, children rise in. */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
};

/** Simple fade-up for a single element (section, panel, empty state). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
};
