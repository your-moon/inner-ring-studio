"use client";

import {
  AvatarGroup,
  BoardCard,
  BoardColumn,
  Button,
  CyclePicker,
  IssueRow,
  Label,
  MilestoneMarker,
  PeekModal,
  PeekModalContent,
  PeekModalTrigger,
  ProjectPicker,
  PropertyRow,
  PriorityPicker,
  RelationRow,
  SlashMenu,
  StatusDot,
  StatusPicker,
  SubIssueList,
  TeamSwitcher,
  type Priority,
  type WorkflowStatus,
} from "@/components/orbit";
import {
  Code as CodeIcon,
  ListChecks,
  TextH,
  TextT,
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

export default function LinearBoardStorybook() {
  const [cycle, setCycle] = useState<string | null>("c12");
  const [project, setProject] = useState<string | null>("p1");
  const [team, setTeam] = useState("moo");
  const [status, setStatus] = useState<WorkflowStatus>("started");
  const [priority, setPriority] = useState<Priority>("high");
  const [slash, setSlash] = useState("text");

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 14
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear board &amp; detail
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          More Linear surfaces: the kanban board, the issue peek, sub-issues and
          relations, cycle/project/team pickers, milestones, and the slash menu.
        </p>
      </header>

      <CatalogSection
        title="Board"
        description="Kanban columns with status headers and issue cards."
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          <BoardColumn status="todo" title="Todo" count={2} onAdd={() => {}}>
            <BoardCard
              id="PM-137"
              title="Vault sync drops rows on conflict"
              priority="urgent"
              footer={<><Label color="red">bug</Label><AvatarGroup size="sm" people={[{ name: "Bru" }]} /></>}
            />
            <BoardCard id="PM-140" title="Retry with backoff on connect" priority="medium" />
          </BoardColumn>
          <BoardColumn status="started" title="In Progress" count={1} onAdd={() => {}}>
            <BoardCard
              id="PM-142"
              title="Connection pooling for the Postgres proxy"
              priority="high"
              footer={<><Label color="blue">backend</Label><AvatarGroup size="sm" people={[{ name: "Alex" }]} /></>}
            />
          </BoardColumn>
          <BoardColumn status="done" title="Done" count={1}>
            <BoardCard id="PM-131" title="Grid latency chip" priority="low" />
          </BoardColumn>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Issue peek"
        description="A wide right-anchored overlay that opens a record with a properties aside."
      >
        <PeekModal>
          <PeekModalTrigger asChild>
            <Button variant="secondary" title="Open PM-142" />
          </PeekModalTrigger>
          <PeekModalContent
            title="PM-142 · Connection pooling"
            onExpand={() => {}}
            aside={
              <div className="flex flex-col gap-1">
                <PropertyRow label="Status">
                  <StatusPicker value={status} onChange={setStatus} />
                </PropertyRow>
                <PropertyRow label="Priority">
                  <PriorityPicker value={priority} onChange={setPriority} />
                </PropertyRow>
              </div>
            }
          >
            <SubIssueList done={1} total={3}>
              <IssueRow id="PM-201" title="Add pool config" status="done" priority="medium" />
              <IssueRow id="PM-202" title="Wire pool metrics" status="started" priority="low" />
              <IssueRow id="PM-203" title="Doc the pool knobs" status="todo" priority="low" />
            </SubIssueList>
            <div className="mt-4 flex flex-col">
              <RelationRow kind="blocked-by" id="PM-140" title="Retry with backoff" onRemove={() => {}} />
              <RelationRow kind="related" id="PM-131" title="Grid latency chip" onRemove={() => {}} />
            </div>
          </PeekModalContent>
        </PeekModal>
      </CatalogSection>

      <CatalogSection
        title="Cycle, project, team & milestone"
        description="The planning pickers and a milestone marker."
      >
        <div className="border-border-default bg-surface-panel flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] border p-4">
          <CyclePicker
            value={cycle}
            onChange={setCycle}
            cycles={[
              { value: "c12", label: "Cycle 12", done: 26, total: 46 },
              { value: "c13", label: "Cycle 13", done: 2, total: 40 },
            ]}
          />
          <ProjectPicker
            value={project}
            onChange={setProject}
            projects={[
              { value: "p1", label: "Postgres proxy", done: 8, total: 20 },
              { value: "p2", label: "Vault v2", done: 1, total: 12 },
            ]}
          />
          <TeamSwitcher
            activeId={team}
            onSelect={setTeam}
            teams={[
              { id: "moo", name: "Moon", key: "MOO" },
              { id: "vms", name: "Vending", key: "VMS" },
            ]}
          />
          <MilestoneMarker label="Beta" reached />
          <MilestoneMarker label="GA" />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Slash menu"
        description="The editor / menu of block types."
      >
        <SlashMenu
          activeValue={slash}
          onSelect={setSlash}
          commands={[
            { value: "text", label: "Text", hint: "Plain paragraph", icon: <TextT /> },
            { value: "h1", label: "Heading 1", hint: "Big section heading", icon: <TextH /> },
            { value: "todo", label: "To-do list", hint: "Track tasks", icon: <ListChecks /> },
            { value: "code", label: "Code block", hint: "Monospaced", icon: <CodeIcon /> },
          ]}
        />
      </CatalogSection>
    </main>
  );
}
