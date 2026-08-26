"use client";

import {
  ActivityFeedItem,
  Badge,
  BarChart,
  Button,
  CHART_COLORS,
  ChartCard,
  ChartLegend,
  DonutChart,
  HealthBadge,
  IconButton,
  IssueRow,
  ProjectRow,
  Sparkline,
  StatDelta,
  SidebarNavItem,
  SidebarSection,
} from "@/components/orbit";
import {
  Bell,
  CirclesFour,
  Cube,
  GitBranch,
  MagnifyingGlass,
  Plus,
  Rocket,
  Stack,
  Tray,
} from "@phosphor-icons/react";
import { useState } from "react";

const statusData = [
  { label: "Backlog", value: 18, color: CHART_COLORS[0] },
  { label: "Todo", value: 11, color: CHART_COLORS[1] },
  { label: "In Prog", value: 6, color: CHART_COLORS[3] },
  { label: "Done", value: 34, color: CHART_COLORS[4] },
];

export default function DashboardExample() {
  const [nav, setNav] = useState("home");

  return (
    <main className="mx-auto w-full max-w-[1200px] px-2 pt-8 pb-24 sm:px-6">
      <header className="mb-6">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          Example
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Simple dashboard
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          A small application screen assembled entirely from Orbit components —
          sidebar nav, stat cards, charts, and issue / project lists.
        </p>
      </header>

      {/* Framed app window */}
      <div className="border-border-default bg-surface-canvas flex h-[720px] overflow-hidden rounded-[var(--radius-modal)] border shadow-[var(--shadow-raised)]">
        {/* Sidebar */}
        <aside className="bg-sidebar border-border-subtle hidden w-56 shrink-0 flex-col border-r p-2 md:flex">
          <div className="flex items-center justify-between px-1 pb-3">
            <span className="flex items-center gap-2">
              <span className="bg-primary grid size-6 place-items-center rounded-[var(--radius-control)] text-[13px] font-semibold [color:var(--primary-foreground)]">
                M
              </span>
              <span className="text-ui-small font-semibold">Moon</span>
            </span>
            <IconButton aria-label="Notifications" size="sm">
              <Bell />
            </IconButton>
          </div>

          <div className="flex flex-col gap-px">
            <SidebarNavItem icon={<Tray />} label="Inbox" count={3} active={nav === "home"} onClick={() => setNav("home")} />
            <SidebarNavItem icon={<CirclesFour />} label="My issues" active={nav === "mine"} onClick={() => setNav("mine")} />
          </div>

          <SidebarSection title="Workspace" className="mt-3">
            <SidebarNavItem icon={<Rocket />} label="Issues" active={nav === "issues"} onClick={() => setNav("issues")} />
            <SidebarNavItem icon={<Stack />} label="Projects" active={nav === "projects"} onClick={() => setNav("projects")} />
          </SidebarSection>

          <SidebarSection title="Favorites" className="mt-3">
            <SidebarNavItem icon={<Cube />} label="Postgres proxy" onClick={() => {}} />
            <SidebarNavItem icon={<Cube />} label="Encrypted vault" onClick={() => {}} />
          </SidebarSection>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="border-border-subtle bg-surface-panel flex h-12 shrink-0 items-center justify-between border-b px-4">
            <span className="text-ui-default font-[var(--weight-medium)] [color:var(--content-primary)]">
              Overview
            </span>
            <div className="flex items-center gap-2">
              <IconButton aria-label="Search"><MagnifyingGlass /></IconButton>
              <Button variant="primary" size="sm" title="New issue">
                <Plus />
              </Button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {/* Stat row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="border-border-default bg-surface-panel flex items-end justify-between rounded-[var(--radius-panel)] border p-4">
                <StatDelta label="Completed" value="34" delta="18%" direction="up" />
                <Sparkline values={[8, 11, 9, 14, 12, 18, 22, 34]} />
              </div>
              <div className="border-border-default bg-surface-panel flex items-end justify-between rounded-[var(--radius-panel)] border p-4">
                <StatDelta label="Open" value="35" delta="4%" direction="down" invert />
                <Sparkline values={[40, 38, 41, 37, 36, 35]} color={CHART_COLORS[4]} />
              </div>
              <div className="border-border-default bg-surface-panel flex items-end justify-between rounded-[var(--radius-panel)] border p-4">
                <StatDelta label="Cycle scope" value="46" delta="0%" direction="flat" />
                <Sparkline values={[46, 46, 45, 46]} color={CHART_COLORS[1]} />
              </div>
              <div className="border-border-default bg-surface-panel flex items-end justify-between rounded-[var(--radius-panel)] border p-4">
                <StatDelta label="Velocity" value="12" delta="9%" direction="up" />
                <Sparkline values={[6, 8, 7, 9, 11, 12]} color={CHART_COLORS[3]} />
              </div>
            </div>

            {/* Charts */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <ChartCard title="Issues by status" className="lg:col-span-2" action={<Badge intent="neutral">This cycle</Badge>}>
                <BarChart data={statusData} height={140} />
              </ChartCard>
              <ChartCard title="Breakdown">
                <div className="flex items-center gap-4">
                  <DonutChart
                    data={statusData}
                    centerLabel={
                      <>
                        <span className="text-heading-small font-semibold [color:var(--content-primary)]">69</span>
                        <span className="text-ui-caption block [color:var(--content-tertiary)]">total</span>
                      </>
                    }
                  />
                  <ChartLegend className="flex-col" items={statusData.map((d) => ({ label: d.label, color: d.color!, value: d.value }))} />
                </div>
              </ChartCard>
            </div>

            {/* Lists */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Recent issues */}
              <div className="border-border-default bg-surface-panel flex flex-col rounded-[var(--radius-panel)] border">
                <div className="border-border-subtle flex items-center justify-between border-b px-4 py-2.5">
                  <span className="text-ui-default font-[var(--weight-medium)]">Recent issues</span>
                  <Button variant="ghost" size="sm" title="View all" />
                </div>
                <div className="divide-border-subtle divide-y py-1">
                  <IssueRow id="MOO-42" title="Pool exhausts under burst load" priority="urgent" status="started" trailing={<Badge intent="danger">bug</Badge>} />
                  <IssueRow id="MOO-39" title="Add connection-pool metrics" priority="high" status="todo" />
                  <IssueRow id="MOO-37" title="Prod write-confirm gate" priority="medium" status="todo" />
                  <IssueRow id="MOO-30" title="Encrypt vault at rest" priority="low" status="done" trailing={<GitBranch className="size-3.5 [color:var(--content-tertiary)]" />} />
                </div>
              </div>

              {/* Projects + activity */}
              <div className="flex flex-col gap-4">
                <div className="border-border-default bg-surface-panel flex flex-col rounded-[var(--radius-panel)] border px-4">
                  <div className="border-border-subtle flex items-center justify-between border-b py-2.5">
                    <span className="text-ui-default font-[var(--weight-medium)]">Active projects</span>
                    <HealthBadge health="on-track" className="h-5" />
                  </div>
                  <ProjectRow name="Postgres proxy" icon={<Stack />} done={8} total={20} update="2d ago" lead={{ name: "Alex" }} onClick={() => {}} />
                  <ProjectRow name="Encrypted vault" icon={<Cube />} done={3} total={12} update="5d ago" lead={{ name: "Bru" }} onClick={() => {}} />
                </div>

                <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
                  <span className="text-ui-default mb-2 block font-[var(--weight-medium)]">Activity</span>
                  <ActivityFeedItem actor="Alex" time="2h">changed status to <b>In Progress</b></ActivityFeedItem>
                  <ActivityFeedItem actor="Bru" time="4h">completed <b>MOO-30</b></ActivityFeedItem>
                  <ActivityFeedItem icon={<GitBranch />} time="6h" last>linked branch <b>feat/pooling</b></ActivityFeedItem>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
