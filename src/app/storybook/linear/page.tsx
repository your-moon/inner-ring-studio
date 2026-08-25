"use client";

import {
  AssigneePicker,
  AvatarGroup,
  Badge,
  Button,
  CommentComposer,
  CommentItem,
  EstimatePicker,
  IssueRow,
  KeyboardShortcutList,
  Kbd,
  Label,
  ProgressDonut,
  Reactions,
  SegmentedProgress,
  StatusDot,
  WorkspaceSwitcher,
  type Priority,
  type Reaction,
  type WorkflowStatus,
} from "@/components/orbit";
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

const ISSUES: {
  id: string;
  title: string;
  status: WorkflowStatus;
  priority: Priority;
}[] = [
  { id: "PM-142", title: "Connection pooling for the Postgres proxy", status: "started", priority: "high" },
  { id: "PM-137", title: "Vault sync drops rows on conflict", status: "todo", priority: "urgent" },
  { id: "PM-131", title: "Grid latency chip in the query toolbar", status: "done", priority: "medium" },
];

const PEOPLE = [
  { id: "a", name: "Alex" },
  { id: "b", name: "Bru" },
  { id: "c", name: "Cy" },
];

export default function LinearStorybook() {
  const [assignee, setAssignee] = useState<string | null>("a");
  const [estimate, setEstimate] = useState<number | null>(3);
  const [workspace, setWorkspace] = useState("moon");
  const [reactions, setReactions] = useState<Reaction[]>([
    { emoji: "👍", count: 3, reacted: true },
    { emoji: "🎉", count: 1 },
  ]);
  const [comments, setComments] = useState([
    { author: "Bru", time: "2h ago", body: "Can we cap the pool at 20?" },
  ]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 13
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear patterns
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          Direct copies of Linear surfaces: the issue row, progress, assignee
          and estimate menus, reactions, comments, the shortcut sheet, and the
          workspace switcher.
        </p>
      </header>

      <CatalogSection
        title="Issue row"
        description="Priority + status glyphs, id, title, and a trailing metadata cluster."
      >
        <div className="border-border-default bg-surface-panel divide-border-subtle divide-y overflow-hidden rounded-[var(--radius-panel)] border">
          {ISSUES.map((iss) => (
            <IssueRow
              key={iss.id}
              id={iss.id}
              title={iss.title}
              status={iss.status}
              priority={iss.priority}
              trailing={
                <>
                  <Label color="blue">backend</Label>
                  <AvatarGroup size="sm" people={[{ name: "Alex" }]} />
                  <span className="text-ui-caption text-content-tertiary w-12 text-right">Aug 24</span>
                </>
              }
            />
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        title="Progress"
        description="The sub-issue donut and the cycle/project segmented bar."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-border-default bg-surface-panel flex items-center gap-4 rounded-[var(--radius-panel)] border p-5">
            <div className="flex items-center gap-2">
              <ProgressDonut value={2} total={5} />
              <span className="text-ui-small text-content-secondary">2 / 5 sub-issues</span>
            </div>
            <div className="flex items-center gap-2">
              <ProgressDonut value={5} total={5} />
              <span className="text-ui-small text-content-secondary">Complete</span>
            </div>
          </div>
          <div className="border-border-default bg-surface-panel flex flex-col justify-center gap-2 rounded-[var(--radius-panel)] border p-5">
            <SegmentedProgress
              total={46}
              segments={[
                { value: 18, color: "var(--intent-accent)", label: "Done" },
                { value: 8, color: "#f2c94c", label: "In Progress" },
              ]}
            />
            <span className="text-ui-caption text-content-tertiary">26 of 46 · cycle 12</span>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Assignee & estimate"
        description="Avatar assignee menu with Unassigned; the points estimate menu."
      >
        <div className="border-border-default bg-surface-panel flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border p-4">
          <AssigneePicker people={PEOPLE} value={assignee} onChange={setAssignee} />
          <EstimatePicker value={estimate} onChange={setEstimate} />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Reactions & comments"
        description="Emoji reaction pills, a comment composer, and posted comments."
      >
        <div className="border-border-default bg-surface-panel flex flex-col gap-4 rounded-[var(--radius-panel)] border p-5">
          {comments.map((c, i) => (
            <CommentItem
              key={i}
              author={c.author}
              time={c.time}
              footer={
                <Reactions
                  reactions={reactions}
                  onAdd={() => {}}
                  onToggle={(emoji) =>
                    setReactions((rs) =>
                      rs.map((r) =>
                        r.emoji === emoji
                          ? { ...r, reacted: !r.reacted, count: r.count + (r.reacted ? -1 : 1) }
                          : r,
                      ),
                    )
                  }
                />
              }
            >
              {c.body}
            </CommentItem>
          ))}
          <CommentComposer
            author="You"
            onSubmit={(body) =>
              setComments((cs) => [...cs, { author: "You", time: "now", body }])
            }
          />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Workspace switcher & shortcuts"
        description="The top-left workspace menu, and the keyboard cheatsheet."
      >
        <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
          <div className="border-border-default bg-surface-panel h-fit rounded-[var(--radius-panel)] border p-2">
            <WorkspaceSwitcher
              activeId={workspace}
              onSelect={setWorkspace}
              onCreate={() => {}}
              workspaces={[
                { id: "moon", name: "Moon" },
                { id: "vms", name: "Vending System" },
              ]}
            />
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-5">
            <KeyboardShortcutList
              groups={[
                {
                  title: "Navigation",
                  entries: [
                    { label: "Command menu", keys: <Kbd>⌘K</Kbd> },
                    { label: "Go to issues", keys: <><Kbd>G</Kbd><Kbd>I</Kbd></> },
                  ],
                },
                {
                  title: "Issue",
                  entries: [
                    { label: "Assign to me", keys: <Kbd>I</Kbd> },
                    { label: "Set priority", keys: <Kbd>P</Kbd> },
                  ],
                },
              ]}
            />
          </div>
        </div>
      </CatalogSection>
    </main>
  );
}
