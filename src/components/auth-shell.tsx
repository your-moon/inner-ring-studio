"use client";

import { ReactNode } from "react";

// Deterministic "star field" so SSR and client render identically.
const STARS = [
  [70, 90, 1], [140, 60, 0.8], [210, 130, 1.2], [300, 80, 0.7], [380, 160, 1],
  [110, 220, 0.9], [260, 250, 1.1], [420, 240, 0.8], [60, 320, 1], [180, 360, 0.7],
  [340, 340, 1.2], [470, 320, 0.9], [90, 430, 0.8], [230, 460, 1], [400, 450, 1.1],
  [150, 520, 0.7], [320, 540, 0.9], [500, 500, 1], [50, 600, 1.1], [260, 620, 0.8],
  [430, 610, 1], [120, 700, 0.9], [360, 720, 1.2], [510, 690, 0.7], [200, 760, 1],
];

/**
 * The "inner ring" orbital scene — concentric rings, a few dashed rings orbiting
 * at different speeds with planets riding them, over a soft glow and star field.
 * All motion is transform-based (compositor) so it stays smooth.
 */
function OrbitalScene() {
  const spin = (dur: number, dir: "normal" | "reverse" = "normal") => ({
    transformOrigin: "300px 400px" as const,
    animation: `spin ${dur}s linear infinite`,
    animationDirection: dir,
    willChange: "transform" as const,
  });
  return (
    <svg
      viewBox="0 0 600 800"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5c518" stopOpacity="0.26" />
          <stop offset="60%" stopColor="#f5c518" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7cc" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFEB02" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {/* stars */}
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#e2e8f0" opacity={0.25} />
      ))}

      {/* glow behind the rings */}
      <circle cx="300" cy="400" r="380" fill="url(#glow)" />

      {/* static concentric rings */}
      {[90, 165, 240, 315, 390].map((r) => (
        <circle
          key={r}
          cx="300"
          cy="400"
          r={r}
          stroke="#facc15"
          strokeOpacity={0.13}
          strokeWidth="1"
        />
      ))}

      {/* orbiting dashed rings + planets */}
      <g style={spin(60)}>
        <circle cx="300" cy="400" r="240" stroke="#fde047" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2 14" strokeLinecap="round" />
        <circle cx="300" cy="160" r="6" fill="#fef08a" />
      </g>
      <g style={spin(90, "reverse")}>
        <circle cx="300" cy="400" r="315" stroke="#f5c518" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="1 18" strokeLinecap="round" />
        <circle cx="300" cy="85" r="4" fill="#facc15" />
      </g>
      <g style={spin(40)}>
        <circle cx="300" cy="400" r="165" stroke="#facc15" strokeOpacity="0.38" strokeWidth="1.5" strokeDasharray="3 10" strokeLinecap="round" />
        <circle cx="300" cy="235" r="5" fill="#fde047" />
      </g>

      {/* glowing core */}
      <circle cx="300" cy="400" r="26" fill="url(#core)" />
      <circle cx="300" cy="400" r="52" stroke="#fde047" strokeOpacity="0.55" strokeWidth="2" />
    </svg>
  );
}

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      {/* Brand panel — committed dark, always. */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{
          background:
            "radial-gradient(140% 120% at 30% 0%, #12213f 0%, #0b1120 55%, #05060d 100%)",
        }}
      >
        <OrbitalScene />
        <div className="animate-[fadeUp_0.6s_ease-out] relative z-10 flex items-center gap-2.5 text-white">
          <Mark className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-wide">
            Inner Ring Studio
          </span>
        </div>
        <div className="animate-[fadeUp_0.7s_ease-out] relative z-10">
          <h1 className="max-w-md text-[2.6rem] font-semibold leading-[1.1] text-white">
            Your databases,
            <br />
            one workspace.
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55">
            Browse, query, and edit your own PostgreSQL, MySQL, and ClickHouse —
            in a fast grid and SQL editor, from anywhere.
          </p>
        </div>
        <div className="animate-[fadeUp_0.8s_ease-out] relative z-10 flex items-center gap-2 text-xs font-medium tracking-wide text-white/35">
          <span>Self-hosted</span>
          <span className="text-white/20">·</span>
          <span>Cloud</span>
          <span className="text-white/20">·</span>
          <span>Desktop</span>
        </div>
      </div>

      {/* Form panel. */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Mark className="h-7 w-7 text-neutral-900 dark:text-white" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              Inner Ring Studio
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Shared field + button styles for the auth forms. */
export const authInput =
  "w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#e0cf00] focus:ring-2 focus:ring-[#FFEB02]/35 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

// Brand CTA: Mercury yellow fill with black label (yellow is too light for white
// text — matches fms `onBrand = black`).
export const authButton =
  "w-full rounded-lg bg-[#FFEB02] py-2.5 text-[15px] font-semibold text-black transition-colors hover:bg-[#f2df00] disabled:cursor-not-allowed disabled:opacity-50";
