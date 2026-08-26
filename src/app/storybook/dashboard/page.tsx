"use client";

import {
  Button,
  IconButton,
  IssueRow,
  Label,
  PresenceAvatar,
  SidebarNavItem,
  SidebarSection,
  StatusIcon,
  ViewTabs,
  type Priority,
  type WorkflowStatus,
} from "@/components/orbit";
import {
  Bell,
  CaretDown,
  CirclesFour,
  Cube,
  DotsThree,
  MagnifyingGlass,
  Plus,
  Rocket,
  SlidersHorizontal,
  Stack,
  Tray,
} from "@phosphor-icons/react";
import { useState } from "react";

type Row = {
  id: string;
  title: string;
  priority: Priority;
  label?: { text: string; color: "blue" | "red" | "purple" | "amber" | "green" };
  date: string;
  who: string;
};

const GROUPS: { status: WorkflowStatus; title: string; rows: Row[] }[] = [
  {
    status: "started",
    title: "In Progress",
    rows: [
      { id: "MOO-42", title: "Pool exhausts under burst load", priority: "urgent", label: { text: "bug", color: "red" }, date: "Aug 26", who: "Alex" },
      { id: "MOO-39", title: "Add connection-pool metrics", priority: "high", date: "Aug 25", who: "Bru" },
    ],
  },
  {
    status: "todo",
    title: "Todo",
    rows: [
      { id: "MOO-37", title: "Prod write-confirm gate", priority: "medium", label: { text: "backend", color: "blue" }, date: "Aug 24", who: "Alex" },
      { id: "MOO-33", title: "Vault key rotation", priority: "medium", date: "Aug 23", who: "Cy" },
      { id: "MOO-31", title: "Docs: connection pooling", priority: "low", label: { text: "docs", color: "purple" }, date: "Aug 22", who: "Bru" },
    ],
  },
  {
    status: "backlog",
    title: "Backlog",
    rows: [
      { id: "MOO-22", title: "Investigate slow COUNT(*) on large tables", priority: "low", date: "Aug 18", who: "Cy" },
      { id: "MOO-18", title: "ClickHouse driver spike", priority: "none", label: { text: "spike", color: "amber" }, date: "Aug 15", who: "Alex" },
    ],
  },
];

function GroupHeader({
  status,
  title,
  count,
}: {
  status: WorkflowStatus;
  title: string;
  count: number;
}) {
  return (
    <div className="group/gh bg-surface-panel sticky top-0 z-10 flex h-8 items-center gap-2 px-5">
      <StatusIcon status={status} />
      <span className="text-ui-small font-[var(--weight-medium)] [color:var(--content-primary)]">
        {title}
      </span>
      <span className="text-ui-small [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
        {count}
      </span>
      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/gh:opacity-100">
        <IconButton aria-label={`Add issue to ${title}`} size="sm">
          <Plus />
        </IconButton>
        <IconButton aria-label="Group options" size="sm">
          <DotsThree />
        </IconButton>
      </div>
    </div>
  );
}

function NavHeader() {
  return (
    <button
      type="button"
      className="focus-ring hover:bg-surface-hover -mx-1 mb-1 flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5"
    >
      <span className="bg-primary grid size-5 shrink-0 place-items-center rounded-[var(--radius-small)] text-[11px] font-semibold [color:var(--primary-foreground)]">
        M
      </span>
      <span className="text-ui-small font-[var(--weight-medium)] [color:var(--content-primary)]">
        Moon
      </span>
      <CaretDown className="size-3 [color:var(--content-tertiary)]" />
      <span className="ml-auto flex items-center gap-0.5">
        <IconButton aria-label="Search" size="sm">
          <MagnifyingGlass />
        </IconButton>
        <IconButton aria-label="New issue" size="sm">
          <Plus />
        </IconButton>
      </span>
    </button>
  );
}

export default function DashboardExample() {
  const [nav, setNav] = useState("mine");
  const [tab, setTab] = useState("assigned");

  return (
    <main className="mx-auto w-full max-w-[1200px] px-2 pt-8 pb-24 sm:px-6">
      <header className="mb-6">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          Example
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear-style workspace
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          The My&nbsp;Issues screen, assembled from Orbit — a recessed sidebar
          with the content floating as an inset 12px panel, a view header with
          tabs, and status-grouped issue rows. Shell + metrics matched to
          linear.app (244px sidebar · 12px panel · 8px inset · 28px groups).
        </p>
      </header>

      {/* App window: content floats as an inset rounded panel over the sidebar backdrop */}
      <div className="border-border-default bg-sidebar flex h-[720px] overflow-hidden rounded-[var(--radius-modal)] border shadow-[var(--shadow-raised)]">
        {/* Sidebar — transparent, sits on the recessed backdrop (no divider rule) */}
        <aside className="hidden w-[244px] shrink-0 flex-col p-2 md:flex">
          <NavHeader />
          <div className="flex flex-col gap-px">
            <SidebarNavItem icon={<Tray />} label="Inbox" count={3} active={nav === "inbox"} onClick={() => setNav("inbox")} />
            <SidebarNavItem icon={<CirclesFour />} label="My issues" active={nav === "mine"} onClick={() => setNav("mine")} />
          </div>
          <SidebarSection title="Workspace" className="mt-4">
            <SidebarNavItem icon={<Rocket />} label="Issues" active={nav === "issues"} onClick={() => setNav("issues")} />
            <SidebarNavItem icon={<Stack />} label="Projects" active={nav === "projects"} onClick={() => setNav("projects")} />
          </SidebarSection>
          <SidebarSection title="Favorites" className="mt-4">
            <SidebarNavItem icon={<Cube />} label="Postgres proxy" onClick={() => {}} />
            <SidebarNavItem icon={<Cube />} label="Encrypted vault" onClick={() => {}} />
          </SidebarSection>
        </aside>

        {/* Main content — inset panel */}
        <div className="min-w-0 flex-1 py-2 pr-2">
          <div className="border-border-default bg-surface-panel flex h-full flex-col overflow-hidden rounded-[var(--radius-menu)] border">
            {/* View header */}
            <div className="flex h-14 shrink-0 items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <CirclesFour className="size-4 [color:var(--content-tertiary)]" />
                <h2 className="text-heading-small font-semibold tracking-[var(--tracking-heading)] [color:var(--content-primary)]">
                  My Issues
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <IconButton aria-label="Filter"><SlidersHorizontal /></IconButton>
                <Button variant="secondary" size="sm" title="Display" displayContent="items-last">
                  <CaretDown className="size-3" />
                </Button>
                <IconButton aria-label="View options"><DotsThree /></IconButton>
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-5">
              <ViewTabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "assigned", label: "Assigned", count: 7 },
                  { value: "created", label: "Created", count: 12 },
                  { value: "subscribed", label: "Subscribed", count: 3 },
                ]}
              />
            </div>

            {/* Grouped list */}
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {GROUPS.map((g) => (
                <section key={g.title}>
                  <GroupHeader status={g.status} title={g.title} count={g.rows.length} />
                  {g.rows.map((r) => (
                    <IssueRow
                      key={r.id}
                      id={r.id}
                      title={r.title}
                      priority={r.priority}
                      status={g.status}
                      className="px-5"
                      trailing={
                        <>
                          {r.label ? <Label color={r.label.color}>{r.label.text}</Label> : null}
                          <span className="text-ui-caption hidden w-12 text-right [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums] sm:block">
                            {r.date}
                          </span>
                          <PresenceAvatar name={r.who} size="sm" />
                        </>
                      }
                    />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
