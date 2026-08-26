"use client";

import {
  AreaSparkline,
  BarChart,
  BreakdownBar,
  ChartCard,
  ChartEmpty,
  ChartLegend,
  DonutChart,
  IconButton,
  Sparkline,
  StatDelta,
  TrendBadge,
  CHART_COLORS,
} from "@/components/orbit";
import { DotsThree } from "@phosphor-icons/react";
import type { ReactNode } from "react";

function CatalogSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border-subtle border-t py-9">
      <div className="mb-5">
        <h2 className="text-heading-small font-semibold tracking-[var(--tracking-heading)]">
          {title}
        </h2>
        <p className="text-ui-small text-content-tertiary mt-1 max-w-2xl">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

const statusData = [
  { label: "Backlog", value: 12, color: CHART_COLORS[0] },
  { label: "Todo", value: 8, color: CHART_COLORS[1] },
  { label: "In Prog", value: 5, color: CHART_COLORS[3] },
  { label: "Done", value: 21, color: CHART_COLORS[4] },
];

export default function LinearInsightsStorybook() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 20
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear insights &amp; charts
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          Bar and donut charts, sparklines, legends, delta stats, distribution
          bars and chart cards — modelled on Linear&apos;s insights. Useful for
          the DB product&apos;s query-result summaries too.
        </p>
      </header>

      <CatalogSection
        title="Delta stats & trends"
        description="Metric numbers with a trend delta, and standalone trend badges."
      >
        <div className="flex flex-wrap items-start gap-10">
          <StatDelta label="Completed this cycle" value="21" delta="18%" direction="up" />
          <StatDelta label="Open bugs" value="7" delta="12%" direction="down" invert />
          <StatDelta label="Scope" value="46" delta="0%" direction="flat" />
          <div className="flex items-center gap-3">
            <TrendBadge value="18%" direction="up" />
            <TrendBadge value="12%" direction="down" />
            <TrendBadge value="3%" direction="down" invert />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Charts"
        description="A categorical bar chart and a multi-segment donut with a legend."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Issues by status" action={<IconButton aria-label="Chart options" size="sm"><DotsThree /></IconButton>}>
            <BarChart data={statusData} />
          </ChartCard>
          <ChartCard title="Distribution">
            <div className="flex items-center gap-6">
              <DonutChart
                data={statusData}
                centerLabel={
                  <>
                    <span className="text-heading-small font-semibold [color:var(--content-primary)]">46</span>
                    <span className="text-ui-caption block [color:var(--content-tertiary)]">total</span>
                  </>
                }
              />
              <ChartLegend
                items={statusData.map((d) => ({ label: d.label, color: d.color!, value: d.value }))}
                className="flex-col"
              />
            </div>
          </ChartCard>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Sparklines & distribution"
        description="Inline trend lines, a filled area trend, and a distribution bar."
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-ui-small text-content-tertiary">Velocity</span>
              <Sparkline values={[3, 5, 4, 7, 6, 9, 8, 12]} />
            </div>
            <AreaSparkline values={[3, 5, 4, 7, 6, 9, 8, 12, 10, 14]} />
          </div>
          <div className="max-w-md">
            <BreakdownBar data={statusData} className="mb-2" />
            <ChartLegend items={statusData.map((d) => ({ label: d.label, color: d.color! }))} />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Empty state"
        description="The chart card empty state."
      >
        <ChartCard title="Cycle burndown" className="max-w-md">
          <ChartEmpty />
        </ChartCard>
      </CatalogSection>
    </main>
  );
}
