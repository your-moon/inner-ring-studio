"use client";

import {
  Alert,
  Button,
  Callout,
  EmptyState,
  Kbd,
  Progress,
  Skeleton,
  Spinner,
  StatusDot,
  Stack,
  Inline,
  Toaster,
  toast,
} from "@/components/orbit";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
      {children}
    </div>
  );
}

function DeterminateProgress() {
  const [value, setValue] = useState(20);
  useEffect(() => {
    const t = setInterval(
      () => setValue((v) => (v >= 100 ? 20 : v + 10)),
      700
    );
    return () => clearInterval(t);
  }, []);
  return <Progress value={value} label="Import progress" />;
}

export default function FeedbackStorybook() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <Toaster />
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 06
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Status &amp; feedback
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            How the interface reports what is happening—waiting, succeeding,
            failing—without alarm fatigue. Chroma marks meaning; words carry it.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />7 patterns · ready
        </div>
      </header>

      <CatalogSection
        title="Alert"
        description="An inline banner that explains a state and offers the one action to resolve it. Reserve danger for real failures."
      >
        <Stack gap="md">
          <Alert intent="info" title="Read-only connection">
            You are viewing a replica. Switch to the primary to edit rows.
          </Alert>
          <Alert
            intent="warning"
            title="You are connected to production"
            action={
              <Button size="sm" variant="secondary">
                Review query
              </Button>
            }
          >
            Writes here affect live data. They require an explicit confirm.
          </Alert>
          <Alert
            intent="danger"
            title="Connection failed"
            onDismiss={() => {}}
          >
            Couldn&apos;t reach db.internal:5432 — check the host and SSL mode.
          </Alert>
          <Alert intent="success" title="Vault synced" onDismiss={() => {}}>
            12 connections are up to date.
          </Alert>
        </Stack>
      </CatalogSection>

      <CatalogSection
        title="Callout"
        description="A quieter aside for tips and context—an accent rule, no fill. Not for state changes."
      >
        <Stack gap="sm">
          <Callout intent="info">
            Parameterised queries use <Kbd>:name</Kbd> and are bound safely.
          </Callout>
          <Callout intent="warning">
            Bulk edits skip row-level triggers.
          </Callout>
        </Stack>
      </CatalogSection>

      <CatalogSection
        title="Loading — Spinner, Progress, Skeleton"
        description="Match the wait to the shape: a spinner for a control, a bar for a known job, a skeleton for content taking shape."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Spinner">
            <Inline gap="md">
              <Spinner size={14} />
              <Spinner size={20} />
              <Inline gap="sm">
                <Spinner size={16} label="Running query" />
                <span className="text-ui-small text-content-secondary">
                  Running query…
                </span>
              </Inline>
            </Inline>
          </Card>
          <Card label="Progress — determinate">
            <DeterminateProgress />
          </Card>
          <Card label="Progress — indeterminate">
            <Progress label="Connecting" />
          </Card>
          <Card label="Skeleton — row">
            <Stack gap="sm">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </Stack>
          </Card>
          <Card label="Skeleton — media + text">
            <Inline gap="sm" align="start">
              <Skeleton className="size-10 rounded-full" />
              <Stack gap="sm" className="flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </Stack>
            </Inline>
          </Card>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Toast"
        description="A transient confirmation in the corner. It never blocks; important failures use an Alert in place."
      >
        <Card label="Raise a toast">
          <Inline gap="sm" wrap>
            <Button variant="secondary" onClick={() => toast("Query copied")}>
              Default
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.success("Vault synced")}
            >
              Success
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.error("Couldn't connect")}
            >
              Error
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast("Row deleted", {
                  action: { label: "Undo", onClick: () => {} },
                })
              }
            >
              With action
            </Button>
          </Inline>
        </Card>
      </CatalogSection>

      <CatalogSection
        title="Empty & error states"
        description="One quiet line, never a card or an illustration."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border-border-default h-28 rounded-[var(--radius-panel)] border">
            <EmptyState secondary="Run a query to see rows.">
              No results yet. Run with <Kbd>⌘ + ENTER</Kbd>.
            </EmptyState>
          </div>
          <div className="border-border-default h-28 rounded-[var(--radius-panel)] border">
            <EmptyState secondary="Check your filters or the connection.">
              Couldn&apos;t load rows.
            </EmptyState>
          </div>
        </div>
      </CatalogSection>
    </main>
  );
}
