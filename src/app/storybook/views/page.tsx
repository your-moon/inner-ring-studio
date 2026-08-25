"use client";

import {
  AppliedFilters,
  AvatarGroup,
  DatePicker,
  DisplayOptions,
  DisplayOptionRow,
  FilterBuilder,
  FilterChip,
  LabelPicker,
  PriorityPicker,
  SegmentedControl,
  StatusDot,
  StatusPicker,
  Switch,
  ViewTabs,
  type LabelOption,
  type Priority,
  type WorkflowStatus,
} from "@/components/orbit";
import {
  CalendarBlank,
  CircleDashed,
  Tag,
  User,
  WarningOctagon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";

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

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border-default bg-surface-panel flex flex-col gap-3 rounded-[var(--radius-panel)] border p-5">
      <div className="text-ui-caption text-content-tertiary">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const LABELS: LabelOption[] = [
  { value: "backend", label: "backend", color: "blue" },
  { value: "bug", label: "bug", color: "red" },
  { value: "ui", label: "ui", color: "green" },
  { value: "perf", label: "perf", color: "orange" },
];

export default function ViewsStorybook() {
  const [view, setView] = useState("active");
  const [status, setStatus] = useState<WorkflowStatus>("started");
  const [priority, setPriority] = useState<Priority>("high");
  const [labels, setLabels] = useState<string[]>(["backend"]);
  const [date, setDate] = useState<Date | null>(new Date("2026-08-24"));
  const [group, setGroup] = useState("status");
  const [showEmpty, setShowEmpty] = useState(true);
  const [filters, setFilters] = useState<string[]>(["status"]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 10
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Views &amp; pickers
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            The Linear view grammar: a filter bar, view tabs, display options,
            and the property pickers that set status, priority, labels, and
            dates.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />10 components · ready
        </div>
      </header>

      <CatalogSection
        title="View tabs & toolbar"
        description="Tabs switch saved views; the filter bar and Display popover sit to the right."
      >
        <div className="border-border-default bg-surface-panel flex flex-col gap-4 rounded-[var(--radius-panel)] border p-5">
          <div className="flex items-center justify-between gap-4">
            <ViewTabs
              value={view}
              onChange={setView}
              tabs={[
                { value: "active", label: "Active", count: 12 },
                { value: "backlog", label: "Backlog", count: 34 },
                { value: "all", label: "All issues", count: 46 },
              ]}
            />
            <DisplayOptions>
              <DisplayOptionRow label="Grouping">
                <SegmentedControl
                  aria-label="Grouping"
                  size="sm"
                  value={group}
                  onChange={setGroup}
                  options={[
                    { value: "status", label: "Status" },
                    { value: "priority", label: "Priority" },
                    { value: "none", label: "None" },
                  ]}
                />
              </DisplayOptionRow>
              <DisplayOptionRow label="Show empty groups">
                <Switch
                  aria-label="Show empty groups"
                  checked={showEmpty}
                  onCheckedChange={setShowEmpty}
                />
              </DisplayOptionRow>
            </DisplayOptions>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Filter bar"
        description="Applied filters render as removable chips; the + Filter pill opens a field menu."
      >
        <AppliedFilters>
          {filters.includes("status") ? (
            <FilterChip
              field="Status"
              value="In Progress"
              onRemove={() => setFilters((f) => f.filter((x) => x !== "status"))}
            />
          ) : null}
          {filters.includes("priority") ? (
            <FilterChip
              field="Priority"
              operator="is"
              value="High"
              onRemove={() =>
                setFilters((f) => f.filter((x) => x !== "priority"))
              }
            />
          ) : null}
          <FilterBuilder
            fields={[
              { value: "status", label: "Status", icon: <CircleDashed /> },
              { value: "priority", label: "Priority", icon: <WarningOctagon /> },
              { value: "labels", label: "Labels", icon: <Tag /> },
              { value: "assignee", label: "Assignee", icon: <User /> },
              { value: "date", label: "Created", icon: <CalendarBlank /> },
            ]}
            onAddField={(f) =>
              setFilters((prev) => (prev.includes(f) ? prev : [...prev, f]))
            }
          />
        </AppliedFilters>
      </CatalogSection>

      <CatalogSection
        title="Property pickers"
        description="Click to change status, priority, labels, or a date — the glyph or colored dot travels with the value."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="StatusPicker">
            <StatusPicker value={status} onChange={setStatus} />
          </Card>
          <Card label="PriorityPicker">
            <PriorityPicker value={priority} onChange={setPriority} />
          </Card>
          <Card label="LabelPicker">
            <LabelPicker options={LABELS} value={labels} onChange={setLabels} />
          </Card>
          <Card label="DatePicker">
            <DatePicker value={date} onChange={setDate} />
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Avatar group"
        description="Overlapping assignees with a +N overflow."
      >
        <div className="flex items-center gap-6">
          <AvatarGroup
            people={[
              { name: "Alex" },
              { name: "Bru" },
              { name: "Cy" },
            ]}
          />
          <AvatarGroup
            people={[
              { name: "Alex" },
              { name: "Bru" },
              { name: "Cy" },
              { name: "Dee" },
              { name: "Eve" },
              { name: "Fin" },
            ]}
            max={4}
          />
        </div>
      </CatalogSection>
    </main>
  );
}
