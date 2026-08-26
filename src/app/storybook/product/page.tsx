"use client";

import {
  Button,
  ColumnTypeBadge,
  ConnectionCard,
  ConnectionStatus,
  DropdownMenuItem,
  IconButton,
  ProductionEnvironmentBanner,
  QueryTabBar,
  QueryToolbar,
  ResultStatusBar,
  RunQueryButton,
  StatusDot,
  VaultSyncStatus,
  WriteConfirmationDialog,
} from "@/components/orbit";
import { Ellipsis } from "lucide-react";
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

const TYPES = ["int4", "text", "bool", "timestamptz", "jsonb", "uuid", "numeric"];

export default function ProductStorybook() {
  const [activeTab, setActiveTab] = useState("q1");
  const [tabs, setTabs] = useState([
    { id: "q1", label: "orders.sql", dirty: true },
    { id: "q2", label: "users.sql" },
    { id: "q3", label: "Query 3" },
  ]);
  const [limit, setLimit] = useState(500);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 12
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          PMSQL product
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          The database-specific surfaces: connections, the query workspace, and
          the safety rails around production writes.
        </p>
      </header>

      <CatalogSection
        title="Connections"
        description="A connection card with dialect, environment, liveness, and the vault sync state."
      >
        <div className="flex flex-col gap-3">
          <ConnectionCard
            name="Production replica"
            dialect="postgres"
            host="db.internal:5432"
            environment="production"
            state="connected"
            actions={<IconButton aria-label="Connection options"><Ellipsis /></IconButton>}
          />
          <ConnectionCard
            name="Staging"
            dialect="mysql"
            host="staging.db:3306"
            environment="staging"
            state="connecting"
          />
          <ConnectionCard
            name="Local analytics"
            dialect="clickhouse"
            host="localhost:8123"
            state="offline"
          />
          <div className="flex items-center gap-6 pt-1">
            <ConnectionStatus state="connected" />
            <ConnectionStatus state="connecting" />
            <ConnectionStatus state="offline" />
            <VaultSyncStatus state="synced" at="just now" />
            <VaultSyncStatus state="syncing" />
            <VaultSyncStatus state="error" />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Column types"
        description="SQL types as quiet badges, tinted by type family (numeric, text, temporal, json…)."
      >
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <ColumnTypeBadge key={t} type={t} />
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        title="Query workspace"
        description="Tab bar, editor toolbar with the run control and row limit, and the result status bar."
      >
        <div className="border-border-default overflow-hidden rounded-[var(--radius-panel)] border">
          <QueryTabBar
            tabs={tabs}
            activeId={activeTab}
            onSelect={setActiveTab}
            onClose={(id) => setTabs((t) => t.filter((x) => x.id !== id))}
            onNew={() =>
              setTabs((t) => [...t, { id: `q${t.length + 1}`, label: `Query ${t.length + 1}` }])
            }
          />
          <ProductionEnvironmentBanner />
          <QueryToolbar
            limit={limit}
            onLimitChange={setLimit}
            onFormat={() => {}}
          >
            <RunQueryButton
              running={running}
              onRun={() => {
                setRunning(true);
                setTimeout(() => setRunning(false), 900);
              }}
              menu={
                <>
                  <DropdownMenuItem>Run selection</DropdownMenuItem>
                  <DropdownMenuItem>Run and download CSV</DropdownMenuItem>
                </>
              }
            />
          </QueryToolbar>
          <div className="bg-surface-canvas grid h-24 place-items-center text-ui-small text-content-tertiary">
            select * from public.orders where total &gt; 100 limit {limit};
          </div>
          <ResultStatusBar
            rows={482}
            elapsedMs={42}
            status={<StatusDot status="live" />}
          />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Production write confirmation"
        description="Before a write to a prod target, the exact statement is shown for a last read."
      >
        <Button
          variant="destructive"
          title="Run UPDATE on production"
          onClick={() => setConfirmOpen(true)}
        />
        <WriteConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          environment="production"
          sql={"update users\nset plan = 'pro'\nwhere created_at < now() - interval '1 year';"}
          onConfirm={() => setConfirmOpen(false)}
        />
      </CatalogSection>
    </main>
  );
}
