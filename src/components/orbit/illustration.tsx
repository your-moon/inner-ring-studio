import { cn } from "@/lib/utils";
import { useId } from "react";

/**
 * Line-art illustrations for Orbit empty / hero states.
 *
 * The aesthetic is a single hairline technical diagram: monochrome, no fills,
 * drawn entirely with `currentColor` so it themes in light AND dark mode. The
 * root <svg> defaults its color to `--content-tertiary` (a quiet ink) and every
 * stroke inherits it; pass a `className` with a `text-*` / `[color:var(--…)]`
 * utility to retint the whole drawing.
 *
 * A soft mirrored reflection sits beneath each motif — a second, low-opacity
 * copy flipped about a baseline and faded out through a luminance mask (a white
 * → transparent gradient), so the fade is colour-agnostic and survives theming.
 */

type Decorative = {
  /** Rendered pixel width; height follows the viewBox aspect ratio. */
  size?: number;
  className?: string;
  /**
   * When set, the illustration is announced (role="img", aria-label=title).
   * Omit to keep it decorative (aria-hidden).
   */
  title?: string;
};

/** Shared stroke defaults for every hairline path in this file. */
const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function ariaProps(title?: string) {
  return title
    ? ({ role: "img", "aria-label": title } as const)
    : ({ "aria-hidden": true, role: "presentation" } as const);
}

/**
 * OrbitIllustration — the "assembling orbit" motif: a deconstructed torus shown
 * as a solid top arc and a dashed bottom arc, a small open hub cylinder floating
 * in the centre, and `<` / `>` chevrons framing it left and right, all sitting
 * over a faded mirror reflection.
 */
export function OrbitIllustration({ size = 120, className, title }: Decorative) {
  const uid = useId();
  const maskId = `orbit-fade-${uid}`;
  const glyphId = `orbit-glyph-${uid}`;

  // The motif is authored once in <defs> and instanced twice: upright, then
  // flipped about the baseline (y = 66) for the reflection. 132 - y mirrors it.
  return (
    <svg
      width={size}
      height={size * (116 / 120)}
      viewBox="0 0 120 116"
      className={cn("text-[color:var(--content-tertiary)]", className)}
      {...ariaProps(title)}
    >
      <defs>
        <g id={glyphId}>
          {/* Top torus arc — a thin ribbon (outer + inner edge + end caps). */}
          <path d="M37 43 C43 22 77 22 83 43" {...strokeProps} />
          <path d="M42 43 C47 28 73 28 78 43" {...strokeProps} />
          <path d="M37 43 Q39.5 46 42 43" {...strokeProps} />
          <path d="M78 43 Q80.5 46 83 43" {...strokeProps} />

          {/* Bottom torus arc — same ribbon, dashed (the not-yet-assembled half). */}
          <path
            d="M37 52 C43 73 77 73 83 52"
            {...strokeProps}
            strokeDasharray="3 3"
          />
          <path
            d="M42 52 C47 67 73 67 78 52"
            {...strokeProps}
            strokeDasharray="3 3"
          />
          <path d="M37 52 Q39.5 49 42 52" {...strokeProps} />
          <path d="M78 52 Q80.5 49 83 52" {...strokeProps} />

          {/* Centre hub — a short open cylinder / grommet floating between them. */}
          <ellipse cx="60" cy="42" rx="11" ry="4" {...strokeProps} />
          <ellipse cx="60" cy="42" rx="5.5" ry="2" {...strokeProps} />
          <path d="M49 42 L49 52" {...strokeProps} />
          <path d="M71 42 L71 52" {...strokeProps} />
          <path d="M49 52 A11 4 0 0 0 71 52" {...strokeProps} />

          {/* Left chevron — a doubled thin V, echoing the ribbon. */}
          <path d="M24 30 L12 43 L24 56" {...strokeProps} />
          <path d="M24 35 L18 43 L24 51" {...strokeProps} />

          {/* Right chevron — mirror of the left. */}
          <path d="M96 30 L108 43 L96 56" {...strokeProps} />
          <path d="M96 35 L102 43 L96 51" {...strokeProps} />
        </g>

        {/* Luminance mask: white (visible) near the baseline → black (hidden)
            further down, so the reflection dissolves regardless of theme. */}
        <linearGradient
          id={`${maskId}-grad`}
          x1="0"
          y1="66"
          x2="0"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="66" width="120" height="50">
          <rect x="0" y="66" width="120" height="50" fill={`url(#${maskId}-grad)`} />
        </mask>
      </defs>

      <use href={`#${glyphId}`} />
      <g transform="translate(0 132) scale(1 -1)" mask={`url(#${maskId})`}>
        <use href={`#${glyphId}`} />
      </g>
    </svg>
  );
}

/**
 * EmptyIllustration — a quieter line-art empty state: a shallow open tray with a
 * dashed "nothing here" baseline, floating over the same faded reflection. For
 * "no data" / "no connections" panels.
 */
export function EmptyIllustration({ size = 120, className, title }: Decorative) {
  const uid = useId();
  const maskId = `empty-fade-${uid}`;
  const glyphId = `empty-glyph-${uid}`;

  return (
    <svg
      width={size}
      height={size * (100 / 120)}
      viewBox="0 0 120 100"
      className={cn("text-[color:var(--content-tertiary)]", className)}
      {...ariaProps(title)}
    >
      <defs>
        <g id={glyphId}>
          {/* Tray box — an open shallow container drawn in isometric-lite. */}
          <path d="M30 34 L60 22 L90 34 L60 46 Z" {...strokeProps} />
          <path d="M30 34 L30 50 L60 62 L60 46" {...strokeProps} />
          <path d="M90 34 L90 50 L60 62" {...strokeProps} />
          {/* Inner rim — hints the tray is hollow. */}
          <path
            d="M40 35 L60 27 L80 35 L60 43 Z"
            {...strokeProps}
            strokeDasharray="2.5 2.5"
          />
          {/* Empty baseline — the "nothing to show" line under the tray. */}
          <path
            d="M32 56 L52 56"
            {...strokeProps}
            strokeDasharray="3 4"
          />
          <path
            d="M68 56 L88 56"
            {...strokeProps}
            strokeDasharray="3 4"
          />
        </g>

        <linearGradient
          id={`${maskId}-grad`}
          x1="0"
          y1="62"
          x2="0"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="white" stopOpacity="0.45" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="62" width="120" height="38">
          <rect x="0" y="62" width="120" height="38" fill={`url(#${maskId}-grad)`} />
        </mask>
      </defs>

      <use href={`#${glyphId}`} />
      <g transform="translate(0 124) scale(1 -1)" mask={`url(#${maskId})`}>
        <use href={`#${glyphId}`} />
      </g>
    </svg>
  );
}
