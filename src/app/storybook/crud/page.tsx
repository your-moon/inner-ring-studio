"use client";

import {
  Badge,
  BulkActionBar,
  Button,
  CommandRow,
  DangerZone,
  GroupByPicker,
  IconButton,
  InspectorPanel,
  Kbd,
  NotificationItem,
  PropertyRow,
  PriorityPicker,
  SavedViewPicker,
  SettingsRow,
  SettingsSection,
  SortBuilder,
  StatusPicker,
  Switch,
  type Priority,
  type WorkflowStatus,
} from "@/components/orbit";
import { ArrowRight, GitBranch, MessageCircle, Search, Trash2 } from "lucide-react";
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

export default function CrudStorybook() {
  const [sortField, setSortField] = useState("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [group, setGroup] = useState("status");
  const [savedView, setSavedView] = useState("active");
  const [selected, setSelected] = useState(3);
  const [status, setStatus] = useState<WorkflowStatus>("started");
  const [priority, setPriority] = useState<Priority>("high");
  const [notifs, setNotifs] = useState(true);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 11
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          CRUD &amp; detail
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          The surfaces around a record: view controls, the selection bar, a
          detail inspector, settings sections, the notification inbox, and
          command rows.
        </p>
      </header>

      <CatalogSection
        title="View controls"
        description="Saved views, sort, and group-by — the toolbar above a list."
      >
        <div className="border-border-default bg-surface-panel flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border p-4">
          <SavedViewPicker
            value={savedView}
            onChange={setSavedView}
            onSaveNew={() => {}}
            views={[
              { value: "active", label: "Active issues" },
              { value: "mine", label: "Assigned to me" },
              { value: "recent", label: "Recently updated" },
            ]}
          />
          <div className="flex-1" />
          <SortBuilder
            field={sortField}
            direction={sortDir}
            onFieldChange={setSortField}
            onDirectionChange={setSortDir}
            fields={[
              { value: "updated", label: "Last updated" },
              { value: "created", label: "Created" },
              { value: "priority", label: "Priority" },
            ]}
          />
          <GroupByPicker
            value={group}
            onChange={setGroup}
            options={[
              { value: "status", label: "Status" },
              { value: "priority", label: "Priority" },
              { value: "none", label: "None" },
            ]}
          />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Bulk action bar"
        description="Appears when rows are selected: count, actions, and clear."
      >
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            title={selected ? "Deselect all" : "Select 3 rows"}
            onClick={() => setSelected((s) => (s ? 0 : 3))}
          />
          <BulkActionBar count={selected} onClear={() => setSelected(0)}>
            <Button variant="ghost" size="sm" title="Move" />
            <Button variant="ghost" size="sm" title="Duplicate" />
            <Button variant="destructive" size="sm" title="Delete">
              <Trash2 />
            </Button>
          </BulkActionBar>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Inspector panel & property rows"
        description="The record detail beside the list — sticky header, editable properties."
      >
        <div className="border-border-default h-[300px] overflow-hidden rounded-[var(--radius-panel)] border">
          <InspectorPanel
            title="PM-142"
            onClose={() => {}}
            className="w-full"
            actions={<IconButton aria-label="Open in new tab" size="sm"><ArrowRight /></IconButton>}
          >
            <div className="text-ui-default mb-3 font-[var(--weight-medium)]">
              Connection pooling for the Postgres proxy
            </div>
            <div className="divide-border-subtle divide-y">
              <PropertyRow label="Status">
                <StatusPicker value={status} onChange={setStatus} />
              </PropertyRow>
              <PropertyRow label="Priority">
                <PriorityPicker value={priority} onChange={setPriority} />
              </PropertyRow>
              <PropertyRow label="Branch">
                <span className="text-ui-default inline-flex items-center gap-1.5">
                  <GitBranch className="size-3.5 text-content-tertiary" />
                  feat/pooling
                </span>
              </PropertyRow>
              <PropertyRow label="Labels">
                <Badge intent="accent" size="sm">backend</Badge>
              </PropertyRow>
            </div>
          </InspectorPanel>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Settings & danger zone"
        description="Grouped settings rows; destructive actions in a red-edged frame."
      >
        <div className="flex flex-col gap-6">
          <SettingsSection
            title="Query defaults"
            description="Applied to new query tabs in this workspace."
          >
            <SettingsRow
              label="Confirm writes on production"
              description="Require an explicit confirm before any write to a prod target."
            >
              <Switch aria-label="Confirm writes" checked onCheckedChange={() => {}} />
            </SettingsRow>
            <SettingsRow
              label="Desktop notifications"
              description="Notify when a long query finishes."
            >
              <Switch
                aria-label="Desktop notifications"
                checked={notifs}
                onCheckedChange={setNotifs}
              />
            </SettingsRow>
          </SettingsSection>

          <DangerZone>
            <SettingsRow
              label="Delete this connection"
              description="Removes the connection and its saved queries. This can't be undone."
            >
              <Button variant="destructive" size="sm" title="Delete" />
            </SettingsRow>
          </DangerZone>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Notifications & command rows"
        description="Inbox rows with unread state; command-palette rows with shortcuts."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-2">
            <NotificationItem
              unread
              icon={<MessageCircle />}
              title="New comment on PM-142"
              detail="Bru: can we cap the pool at 20?"
              time="2h"
            />
            <NotificationItem
              icon={<GitBranch />}
              title="Branch merged"
              detail="feat/pooling → main"
              time="1d"
            />
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-2">
            <CommandRow
              icon={<Search />}
              label="Search tables…"
              shortcut={<Kbd>⌘K</Kbd>}
            />
            <CommandRow
              icon={<ArrowRight />}
              label="Run query"
              hint="editor"
              shortcut={<Kbd>⌘↵</Kbd>}
            />
          </div>
        </div>
      </CatalogSection>
    </main>
  );
}
