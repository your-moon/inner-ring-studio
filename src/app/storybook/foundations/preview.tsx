"use client";

import {
  BREAKPOINTS,
  COLOR_TOKEN_GROUPS,
  DENSITIES,
  DENSITY_METRICS,
  Density,
  ELEVATION_TOKENS,
  FONT_STACK,
  FONT_WEIGHTS,
  FOUNDATION_MOTION,
  ICON_SIZES,
  INTENT_TOKENS,
  RADIUS_TOKENS,
  SPACING_TOKENS,
  TYPOGRAPHY_TOKENS,
  Z_INDEX,
  type DensityName,
  type FoundationToken,
} from "@/components/orbit";
import { cn } from "@/lib/utils";
import { Check, Circle, MousePointerClick, Square } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

function FoundationSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border-subtle border-t py-8 first:border-t-0 first:pt-0">
      <div className="mb-5 grid gap-1 md:grid-cols-[220px_1fr] md:gap-8">
        <h2 className="text-heading-small font-semibold tracking-[-0.015em]">
          {title}
        </h2>
        <p className="text-ui-small text-content-tertiary max-w-2xl">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function TokenLabel({ token }: { token: FoundationToken }) {
  return (
    <div className="min-w-0">
      <div className="text-ui-small truncate font-medium">{token.name}</div>
      <code className="text-ui-caption text-content-tertiary block truncate font-mono">
        {token.variable}
      </code>
    </div>
  );
}

function ColorTokenCard({
  token,
  mode,
}: {
  token: FoundationToken;
  mode: "surface" | "content" | "border";
}) {
  const variable = `var(${token.variable})`;

  return (
    <div className="border-border-subtle bg-surface-panel overflow-hidden rounded-[var(--radius-menu)] border">
      <div
        className="border-border-subtle flex h-20 items-center justify-center border-b"
        style={
          mode === "surface"
            ? { background: variable }
            : mode === "content"
              ? { color: variable }
              : undefined
        }
      >
        {mode === "content" ? (
          <span className="text-heading-medium font-semibold">Aa</span>
        ) : null}
        {mode === "border" ? (
          <span
            className="size-11 rounded-[var(--radius-control)] border-[3px] bg-surface-raised"
            style={{ borderColor: variable }}
          />
        ) : null}
      </div>
      <div className="p-3">
        <TokenLabel token={token} />
        <p className="text-ui-caption text-content-tertiary mt-1 truncate">
          {token.value}
        </p>
      </div>
    </div>
  );
}

function DensityControl({
  density,
  onChange,
}: {
  density: DensityName;
  onChange: (density: DensityName) => void;
}) {
  return (
    <div
      className="border-border-default bg-surface-raised inline-flex rounded-[var(--radius-control)] border p-0.5"
      aria-label="Preview density"
    >
      {DENSITIES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={density === option}
          onClick={() => onChange(option)}
          className={cn(
            "focus-ring text-ui-small min-h-7 rounded-[6px] px-2.5 capitalize",
            density === option
              ? "bg-surface-selected text-content-primary shadow-[var(--shadow-hairline)]"
              : "text-content-tertiary hover:bg-surface-hover hover:text-content-primary",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function FoundationsPreview() {
  const [density, setDensity] = useState<DensityName>("default");

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pb-24 pt-8 sm:px-6">
      <header className="mb-10 flex flex-col justify-between gap-5 border-b border-border-subtle pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium uppercase tracking-[0.08em]">
            PMSQL UI / 01
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Foundations
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Shared visual decisions for every component: semantic color,
            typography, spacing, depth, density, focus, and motion.
          </p>
        </div>
        <DensityControl density={density} onChange={setDensity} />
      </header>

      <Density density={density}>
        <FoundationSection
          title="Density"
          description="Density is scoped. Compact is intended for data-heavy surfaces; comfortable is intended for forms and onboarding."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="border-border-default bg-surface-raised overflow-hidden rounded-[var(--radius-panel)] border">
              {["customers", "invoices", "query_history"].map((name, index) => (
                <div
                  key={name}
                  className="row-height border-border-subtle flex items-center gap-[var(--density-gap)] border-b px-[var(--density-padding-x)] last:border-b-0"
                >
                  <Circle className="size-[var(--icon-sm)] text-content-tertiary" fill="currentColor" />
                  <span className="text-ui-small flex-1 font-medium">{name}</span>
                  <span className="text-ui-caption text-content-tertiary font-mono">
                    {12 + index * 17} columns
                  </span>
                </div>
              ))}
            </div>
            <dl className="border-border-subtle bg-surface-canvas grid grid-cols-3 rounded-[var(--radius-panel)] border p-4 lg:grid-cols-1">
              {Object.entries(DENSITY_METRICS[density]).map(([name, value]) => (
                <div key={name} className="py-1">
                  <dt className="text-ui-caption text-content-tertiary capitalize">{name}</dt>
                  <dd className="text-ui-default mt-0.5 font-mono font-medium">{value}px</dd>
                </div>
              ))}
            </dl>
          </div>
        </FoundationSection>

        <FoundationSection
          title="Semantic color"
          description="Components consume roles such as surface-panel and content-secondary. Raw pigments stay inside the foundation."
        >
          <div className="space-y-7">
            {COLOR_TOKEN_GROUPS.map((group) => {
              const mode =
                group.name === "Surfaces"
                  ? "surface"
                  : group.name === "Borders"
                    ? "border"
                    : "content";
              return (
                <div key={group.name}>
                  <div className="mb-3">
                    <h3 className="text-ui-default font-medium">{group.name}</h3>
                    <p className="text-ui-caption text-content-tertiary">{group.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                    {group.tokens.map((token) => (
                      <ColorTokenCard key={token.variable} token={token} mode={mode} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </FoundationSection>

        <FoundationSection
          title="Intent"
          description="Chroma communicates meaning. Neutral surfaces remain dominant; intent colors appear in status, validation, and destructive actions."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {INTENT_TOKENS.map((token) => (
              <div
                key={token.variable}
                className="border-border-subtle bg-surface-panel rounded-[var(--radius-menu)] border p-3"
              >
                <div
                  className="mb-4 h-2 rounded-full"
                  style={{ background: `var(${token.variable})` }}
                />
                <TokenLabel token={token} />
                <p className="text-ui-caption text-content-tertiary mt-1">
                  {token.value}
                </p>
              </div>
            ))}
          </div>
        </FoundationSection>

        <FoundationSection
          title="Typography"
          description="Measured against Linear's production UI: Inter Variable, 12–15px core product text, and real intermediate weights."
        >
          <div className="space-y-4">
            <div className="border-border-default bg-surface-raised grid gap-5 rounded-[var(--radius-panel)] border p-4 lg:grid-cols-[1.2fr_2fr]">
              <div>
                <div className="text-heading-medium font-medium tracking-[var(--tracking-heading)]">
                  Inter Variable
                </div>
                <code className="text-ui-caption text-content-tertiary mt-1 block font-mono break-words">
                  {FONT_STACK}
                </code>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(FONT_WEIGHTS).map(([name, weight]) => (
                  <div
                    key={name}
                    className="border-border-subtle bg-surface-panel rounded-[var(--radius-control)] border px-3 py-2"
                  >
                    <div className="text-ui-default" style={{ fontWeight: weight }}>
                      Aa
                    </div>
                    <div className="text-ui-caption text-content-tertiary mt-1 capitalize">
                      {name} · {weight}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-border-default bg-surface-panel divide-y divide-border-subtle overflow-hidden rounded-[var(--radius-panel)] border">
              {TYPOGRAPHY_TOKENS.map((token) => {
              const lineHeightVariable = `${token.variable}-line-height`;
              const isHeading = token.name.startsWith("Heading");
              return (
                <div key={token.variable} className="grid gap-3 p-4 md:grid-cols-[180px_1fr] md:items-baseline">
                  <TokenLabel token={token} />
                  <div
                    className="min-w-0 truncate"
                    style={{
                      fontSize: `var(${token.variable})`,
                      lineHeight: `var(${lineHeightVariable})`,
                      fontWeight: isHeading ? "var(--weight-semibold)" : "var(--weight-regular)",
                      letterSpacing: isHeading ? "var(--tracking-heading)" : "var(--tracking-ui)",
                    }}
                  >
                    Connect, inspect, query, and ship with confidence.
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </FoundationSection>

        <FoundationSection
          title="Spacing"
          description="A 4px base grid with a few half-steps supports dense product UI without arbitrary gaps."
        >
          <div className="border-border-default bg-surface-panel grid gap-x-5 gap-y-3 rounded-[var(--radius-panel)] border p-4 md:grid-cols-2">
            {SPACING_TOKENS.map(([name, value]) => (
              <div key={name} className="grid grid-cols-[52px_1fr_48px] items-center gap-3">
                <code className="text-ui-caption text-content-tertiary font-mono">{name}</code>
                <div className="h-1.5 rounded-full bg-surface-canvas">
                  <div className="h-full rounded-full bg-intent-accent" style={{ width: value }} />
                </div>
                <code className="text-ui-caption text-content-tertiary text-right font-mono">{value}</code>
              </div>
            ))}
          </div>
        </FoundationSection>

        <FoundationSection
          title="Radius and elevation"
          description="Controls are gently rounded. Panels use quiet borders; shadows are reserved for floating layers."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="border-border-default bg-surface-panel grid grid-cols-3 gap-4 rounded-[var(--radius-panel)] border p-5">
              {RADIUS_TOKENS.map((token) => (
                <div key={token.variable} className="text-center">
                  <div
                    className="border-border-strong bg-surface-selected mx-auto mb-2 size-16 border"
                    style={{ borderRadius: `var(${token.variable})` }}
                  />
                  <TokenLabel token={token} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {ELEVATION_TOKENS.map((token) => (
                <div
                  key={token.variable}
                  className="bg-surface-overlay flex min-h-28 flex-col justify-end rounded-[var(--radius-menu)] p-4"
                  style={{ boxShadow: `var(${token.variable})` }}
                >
                  <TokenLabel token={token} />
                </div>
              ))}
            </div>
          </div>
        </FoundationSection>

        <FoundationSection
          title="Icons and focus"
          description="Icons align to a five-size scale. Keyboard focus is always visible and independent of hover styling."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border-border-default bg-surface-panel flex flex-wrap items-end gap-6 rounded-[var(--radius-panel)] border p-5">
              {Object.entries(ICON_SIZES).map(([name, size]) => (
                <div key={name} className="text-center">
                  <Square size={size} className="mx-auto text-content-secondary" />
                  <code className="text-ui-caption text-content-tertiary mt-2 block font-mono">
                    {name} · {size}
                  </code>
                </div>
              ))}
            </div>
            <div className="border-border-default bg-surface-panel flex items-center gap-3 rounded-[var(--radius-panel)] border p-5">
              <button
                type="button"
                className="focus-ring control-height border-border-default bg-surface-raised text-ui-small inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-[var(--density-padding-x)] font-medium hover:bg-surface-hover"
              >
                <MousePointerClick className="size-[var(--icon-md)]" />
                Tab to focus
              </button>
              <span className="text-ui-caption text-content-tertiary">
                3px semantic focus halo
              </span>
            </div>
          </div>
        </FoundationSection>

        <FoundationSection
          title="Motion"
          description="Fast, curve-based transitions use opacity and transform. Reduced-motion preferences collapse durations automatically."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(FOUNDATION_MOTION.duration).map(([name, duration]) => (
              <div
                key={name}
                className="group border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4"
              >
                <div className="mb-5 h-8 overflow-hidden rounded-[var(--radius-control)] bg-surface-canvas p-1">
                  <div
                    className="size-6 rounded-[6px] bg-intent-accent transition-transform group-hover:translate-x-20"
                    style={{
                      transitionDuration: `${duration}ms`,
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  />
                </div>
                <div className="text-ui-small font-medium capitalize">{name}</div>
                <code className="text-ui-caption text-content-tertiary font-mono">{duration}ms</code>
              </div>
            ))}
          </div>
        </FoundationSection>

        <FoundationSection
          title="Responsive and stacking"
          description="Breakpoints are content-driven. The stacking scale is intentionally small and shared across overlays."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border-border-default bg-surface-panel overflow-hidden rounded-[var(--radius-panel)] border">
              {Object.entries(BREAKPOINTS).map(([name, value]) => (
                <div key={name} className="border-border-subtle grid grid-cols-[80px_1fr] border-b px-4 py-2.5 last:border-b-0">
                  <code className="text-ui-small font-mono font-medium">{name}</code>
                  <span className="text-ui-small text-content-tertiary">{value}px and above</span>
                </div>
              ))}
            </div>
            <div className="border-border-default bg-surface-panel overflow-hidden rounded-[var(--radius-panel)] border">
              {Object.entries(Z_INDEX).map(([name, value]) => (
                <div key={name} className="border-border-subtle grid grid-cols-[1fr_48px] border-b px-4 py-2.5 last:border-b-0">
                  <span className="text-ui-small capitalize">{name}</span>
                  <code className="text-ui-small text-content-tertiary text-right font-mono">{value}</code>
                </div>
              ))}
            </div>
          </div>
        </FoundationSection>

        <footer className="border-border-default bg-surface-selected flex items-start gap-3 rounded-[var(--radius-panel)] border p-4">
          <span className="bg-intent-success text-content-inverse mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
            <Check size={12} />
          </span>
          <div>
            <div className="text-ui-default font-medium">Foundation contract</div>
            <p className="text-ui-small text-content-secondary mt-0.5">
              Components should consume semantic tokens from the Orbit barrel. Raw color values and one-off motion timings stay out of component code.
            </p>
          </div>
        </footer>
      </Density>
    </main>
  );
}
