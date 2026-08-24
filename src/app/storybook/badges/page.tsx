"use client";

import {
  Badge,
  Chip,
  CountBadge,
  EmptyState,
  EnvBadge,
  Kbd,
  Label,
  LABEL_COLORS,
  PriorityIcon,
  StatusDot,
  StatusIcon,
  type BadgeIntent,
  type LabelColor,
  type Priority,
  type WorkflowStatus,
} from "@/components/orbit";
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

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border-default bg-surface-panel flex flex-col gap-3 rounded-[var(--radius-panel)] border p-5">
      <div className="text-ui-caption text-content-tertiary">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const BADGE_INTENTS: { intent: BadgeIntent; label: string }[] = [
  { intent: "neutral", label: "Draft" },
  { intent: "accent", label: "Beta" },
  { intent: "success", label: "Healthy" },
  { intent: "warning", label: "Degraded" },
  { intent: "danger", label: "Failed" },
  { intent: "info", label: "Syncing" },
];

const STATUSES: WorkflowStatus[] = [
  "backlog",
  "todo",
  "started",
  "done",
  "cancelled",
];

const STATUS_TEXT: Record<WorkflowStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  started: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITIES: Priority[] = ["none", "low", "medium", "high", "urgent"];

const PRIORITY_TEXT: Record<Priority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export default function BadgesStorybook() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 04
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Badges &amp; labels
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Status, priority, environment, and metadata—calibrated against
            Linear. Shape carries meaning first; color only reinforces it, and
            never stands alone.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />8 marks · ready
        </div>
      </header>

      <CatalogSection
        title="Status badge"
        description="Semantic state as a quiet soft-tinted pill. Intent is the meaning; several sit in a row without competing."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Intents">
            {BADGE_INTENTS.map(({ intent, label }) => (
              <Badge key={intent} intent={intent}>
                {label}
              </Badge>
            ))}
          </Card>
          <Card label="With a status dot">
            <Badge intent="success">
              <StatusDot status="live" /> Connected
            </Badge>
            <Badge intent="danger">
              <StatusDot status="error" /> Offline
            </Badge>
          </Card>
          <Card label="Small">
            {BADGE_INTENTS.slice(0, 4).map(({ intent, label }) => (
              <Badge key={intent} intent={intent} size="sm">
                {label}
              </Badge>
            ))}
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Workflow status"
        description="A glyph, not a fill: the shape reads the state even in greyscale, so status never depends on color alone."
      >
        <div className="border-border-default bg-surface-panel flex flex-wrap gap-x-8 gap-y-4 rounded-[var(--radius-panel)] border p-5">
          {STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <StatusIcon status={status} />
              <span className="text-ui-default">{STATUS_TEXT[status]}</span>
            </div>
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        title="Priority"
        description="Ascending bars read by how many are lit; urgent is the one loud mark."
      >
        <div className="border-border-default bg-surface-panel flex flex-wrap gap-x-8 gap-y-4 rounded-[var(--radius-panel)] border p-5">
          {PRIORITIES.map((priority) => (
            <div key={priority} className="flex items-center gap-2">
              <PriorityIcon priority={priority} />
              <span className="text-ui-default">{PRIORITY_TEXT[priority]}</span>
            </div>
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        title="Labels"
        description="A colored dot carries the category color; the text stays neutral. Decorative palette—meaning-bearing chroma belongs to the status badge."
      >
        <div className="border-border-default bg-surface-panel flex flex-wrap gap-2 rounded-[var(--radius-panel)] border p-5">
          {(Object.keys(LABEL_COLORS) as LabelColor[]).map((color) => (
            <Label key={color} color={color}>
              {color}
            </Label>
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        title="Environment & metadata"
        description="Production is the loud one—amber, unmistakable. Staging is neutral, unmarked renders nothing. Chips and counts stay quiet."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Environment badge">
            <span className="text-ui-default">prod-main</span>
            <EnvBadge environment="production" />
            <span className="text-ui-default ml-3">staging-eu</span>
            <EnvBadge environment="staging" />
          </Card>
          <Card label="Chip — quiet metadata">
            <Chip>Postgres</Chip>
            <Chip>VMS</Chip>
            <Chip>read-only</Chip>
          </Card>
          <Card label="Count badge">
            <CountBadge count={3} />
            <CountBadge count={42} />
            <CountBadge count={128} />
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Composed — an issue row"
        description="How the marks read together, the way they do in a real list."
      >
        <div className="border-border-default bg-surface-panel divide-border-subtle divide-y overflow-hidden rounded-[var(--radius-panel)] border">
          {[
            {
              status: "started" as WorkflowStatus,
              priority: "high" as Priority,
              id: "PM-142",
              title: "Connection pooling for the Postgres proxy",
              color: "blue" as LabelColor,
              tag: "backend",
            },
            {
              status: "todo" as WorkflowStatus,
              priority: "urgent" as Priority,
              id: "PM-137",
              title: "Vault sync drops rows on conflict",
              color: "red" as LabelColor,
              tag: "bug",
            },
            {
              status: "done" as WorkflowStatus,
              priority: "medium" as Priority,
              id: "PM-131",
              title: "Grid latency chip in the query toolbar",
              color: "green" as LabelColor,
              tag: "ui",
            },
          ].map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <PriorityIcon priority={row.priority} />
              <StatusIcon status={row.status} />
              <span className="text-ui-caption text-content-tertiary w-14 font-mono">
                {row.id}
              </span>
              <span className="text-ui-default min-w-0 flex-1 truncate">
                {row.title}
              </span>
              <Label color={row.color}>{row.tag}</Label>
            </div>
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        title="Empty state"
        description="One quiet line, never a card."
      >
        <div className="border-border-default h-28 w-full max-w-md rounded-[var(--radius-panel)] border">
          <EmptyState secondary="One quiet line, never a card.">
            Results show up here. Run with <Kbd>⌘ + ENTER</Kbd>.
          </EmptyState>
        </div>
      </CatalogSection>
    </main>
  );
}
