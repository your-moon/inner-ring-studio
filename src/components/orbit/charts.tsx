"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { LABEL_COLORS } from "./tag";

/*
 * Insights / data-viz, modelled on Linear's insights charts — categorical bars,
 * a multi-segment donut, sparklines, legends, delta stats and a chart card.
 * Distinct from ProgressDonut (single value) / SegmentedProgress (progress) /
 * Stat (plain metric). SVG is presentational; feed it computed data.
 */

/** A categorical colour ramp reused across charts (from the label palette). */
export const CHART_COLORS = [
  LABEL_COLORS.blue,
  LABEL_COLORS.indigo,
  LABEL_COLORS.purple,
  LABEL_COLORS.teal,
  LABEL_COLORS.green,
  LABEL_COLORS.amber,
  LABEL_COLORS.orange,
  LABEL_COLORS.red,
  LABEL_COLORS.pink,
] as const;

export type ChartDatum = { label: string; value: number; color?: string };

/* -------------------------------------------------------------------- BarChart */

/** A vertical bar chart with value-scaled bars and category labels. */
export function BarChart({
  data,
  height = 120,
  showValues = true,
  className,
}: {
  data: ChartDatum[];
  height?: number;
  showValues?: boolean;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="flex items-end gap-2"
        style={{ height }}
        role="img"
        aria-label="Bar chart"
      >
        {data.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
            {showValues ? (
              <span className="text-ui-caption [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
                {d.value}
              </span>
            ) : null}
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-[3px] transition-[height]"
                style={{
                  height: `${(d.value / max) * 100}%`,
                  minHeight: 2,
                  backgroundColor: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {data.map((d, i) => (
          <span
            key={i}
            className="text-ui-caption min-w-0 flex-1 truncate text-center [color:var(--content-tertiary)]"
            title={d.label}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ DonutChart */

/** A multi-segment donut with an optional centre label. */
export function DonutChart({
  data,
  size = 120,
  thickness = 16,
  centerLabel,
  className,
}: {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: ReactNode;
  className?: string;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label="Donut chart" className="-rotate-90">
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      {centerLabel != null ? (
        <div className="absolute grid place-items-center text-center">{centerLabel}</div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- Sparkline */

function sparkPath(values: number[], width: number, height: number) {
  if (values.length < 2) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - ((v - min) / span) * height]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area };
}

/** A compact inline trend line (no axes). */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = LABEL_COLORS.indigo,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const { line } = sparkPath(values, width, height);
  return (
    <svg width={width} height={height} role="img" aria-label="Trend" className={cn("overflow-visible", className)}>
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A filled trend line for a metric card. */
export function AreaSparkline({
  values,
  width = 160,
  height = 40,
  color = LABEL_COLORS.indigo,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const { line, area } = sparkPath(values, width, height);
  const id = `spark-${values.length}-${width}`;
  return (
    <svg width={width} height={height} role="img" aria-label="Trend" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ----------------------------------------------------------------- ChartLegend */

/** A legend row of colour keys. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: ReactNode; color: string; value?: ReactNode }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1", className)}>
      {items.map((it, i) => (
        <li key={i} className="text-ui-small flex items-center gap-1.5 [color:var(--content-secondary)]">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
          <span className="truncate">{it.label}</span>
          {it.value != null ? (
            <span className="[color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
              {it.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ TrendBadge */

export type TrendDirection = "up" | "down" | "flat";

/** A ▲/▼ delta pill for a metric. */
export function TrendBadge({
  value,
  direction,
  /** When true, "down" is good (e.g. fewer bugs) and colours invert. */
  invert = false,
  className,
}: {
  value: ReactNode;
  direction: TrendDirection;
  invert?: boolean;
  className?: string;
}) {
  const good = direction === "flat" ? null : (direction === "up") !== invert;
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  return (
    <span
      className={cn(
        "text-ui-caption inline-flex items-center gap-0.5 font-[var(--weight-medium)] [font-variant-numeric:tabular-nums]",
        good == null
          ? "[color:var(--content-tertiary)]"
          : good
            ? "[color:var(--intent-success)]"
            : "[color:var(--intent-danger)]",
        className
      )}
    >
      <span aria-hidden>{arrow}</span>
      {value}
    </span>
  );
}

/* -------------------------------------------------------------------- StatDelta */

/** A metric: a big value, a caption, and a trend delta. */
export function StatDelta({
  label,
  value,
  delta,
  direction = "flat",
  invert,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  direction?: TrendDirection;
  invert?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-ui-small [color:var(--content-tertiary)]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-heading-medium font-semibold [font-variant-numeric:tabular-nums] [color:var(--content-primary)]">
          {value}
        </span>
        {delta != null ? (
          <TrendBadge value={delta} direction={direction} invert={invert} />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- ChartCard */

/** A titled insights card: header (title + action) over the chart body. */
export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-default bg-surface-panel flex flex-col gap-4 rounded-[var(--radius-panel)] border p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-ui-default [color:var(--content-primary)] font-[var(--weight-medium)]">
          {title}
        </span>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- BreakdownBar */

/** A single horizontal bar split into categorical segments (a distribution). */
export function BreakdownBar({
  data,
  height = 8,
  className,
}: {
  data: ChartDatum[];
  height?: number;
  className?: string;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  return (
    <div
      role="img"
      aria-label="Distribution"
      className={cn("bg-surface-hover flex w-full overflow-hidden rounded-[var(--radius-full)]", className)}
      style={{ height }}
    >
      {data.map((d, i) => (
        <span
          key={i}
          title={`${d.label}: ${d.value}`}
          style={{
            width: `${(d.value / total) * 100}%`,
            backgroundColor: d.color ?? CHART_COLORS[i % CHART_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ ChartEmpty */

/** The empty state inside a chart card when there's no data. */
export function ChartEmpty({
  children = "No data for this range.",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-ui-small grid min-h-24 place-items-center text-center [color:var(--content-tertiary)]",
        className
      )}
    >
      {children}
    </div>
  );
}
