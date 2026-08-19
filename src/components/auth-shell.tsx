"use client";

import { ReactNode } from "react";

/** The concentric "inner ring" motif — a slow-orbiting dashed ring over static rings. */
function Rings() {
  return (
    <svg
      viewBox="0 0 600 600"
      className="pointer-events-none absolute -right-24 top-1/2 h-[820px] w-[820px] -translate-y-1/2 opacity-[0.5]"
      fill="none"
    >
      <defs>
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="290" fill="url(#ringGlow)" />
      {[70, 130, 195, 260].map((r) => (
        <circle
          key={r}
          cx="300"
          cy="300"
          r={r}
          stroke="#818cf8"
          strokeOpacity={0.18}
          strokeWidth="1"
        />
      ))}
      {/* orbiting dashed ring */}
      <g
        className="motion-safe:animate-[spin_44s_linear_infinite]"
        style={{ transformOrigin: "300px 300px" }}
      >
        <circle
          cx="300"
          cy="300"
          r="230"
          stroke="#a5b4fc"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
      </g>
      {/* filled core */}
      <circle cx="300" cy="300" r="20" fill="#a5b4fc" fillOpacity="0.9" />
      <circle cx="300" cy="300" r="46" stroke="#a5b4fc" strokeOpacity="0.6" strokeWidth="2" />
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
            "radial-gradient(130% 130% at 25% 15%, #1c1f3a 0%, #0e1020 55%, #07080f 100%)",
        }}
      >
        <Rings />
        <div className="relative z-10 flex items-center gap-2.5 text-white">
          <Mark className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-wide">
            Inner Ring Studio
          </span>
        </div>
        <div className="relative z-10">
          <h1 className="max-w-md text-4xl font-semibold leading-[1.15] text-white">
            Your databases,
            <br />
            one workspace.
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55">
            Browse, query, and edit your own PostgreSQL and ClickHouse — in a fast
            grid and SQL editor, from anywhere.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs font-medium tracking-wide text-white/35">
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
  "w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

export const authButton =
  "w-full rounded-lg bg-indigo-600 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";
