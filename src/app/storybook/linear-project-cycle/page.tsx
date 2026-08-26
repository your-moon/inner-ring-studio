"use client";

import {
  ActiveCycleHeader,
  Button,
  CommandFooter,
  CommandMenu,
  CycleRow,
  DueDateBadge,
  IconButton,
  LinkedResourceRow,
  MilestoneRow,
  PriorityIcon,
  ProjectOverviewHeader,
  ProjectRow,
  ProjectUpdateItem,
  PropertyRow,
  SearchResultGroup,
  SearchResultRow,
  StatusIcon,
  TriageRow,
} from "@/components/orbit";
import { Box, Figma, Github, Layers, PanelsTopLeft, Rocket } from "lucide-react";
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

export default function LinearProjectCycleStorybook() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 21
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear projects, cycles, triage &amp; search
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          Project rows &amp; overview, milestones &amp; updates, cycle rows and the
          active-cycle header, due-date badges, linked resources, triage rows and
          global-search results. Project row (48px) verified on live Linear.
        </p>
      </header>

      <CatalogSection
        title="Projects"
        description="The project list row (48px), the overview header with properties, updates and milestones."
      >
        <div className="flex flex-col gap-6">
          <div className="border-border-default bg-surface-panel divide-border-subtle divide-y rounded-[var(--radius-panel)] border px-4">
            <ProjectRow name="Postgres proxy" icon={<Layers />} health="on-track" done={8} total={20} update="Updated 2d ago" lead={{ name: "Alex" }} onClick={() => {}} />
            <ProjectRow name="Encrypted vault" icon={<Box />} health="at-risk" done={3} total={12} update="No updates" lead={{ name: "Bru" }} onClick={() => {}} />
          </div>

          <div className="border-border-default bg-surface-panel grid gap-6 rounded-[var(--radius-panel)] border p-5 lg:grid-cols-2">
            <ProjectOverviewHeader
              name="Postgres proxy"
              icon={<Layers />}
              summary="A pooled, prod-safe proxy in front of customer Postgres."
              actions={<Button variant="secondary" size="sm" title="Share" />}
              properties={
                <>
                  <PropertyRow label="Lead">Alex</PropertyRow>
                  <PropertyRow label="Target date"><DueDateBadge date="Sep 30" /></PropertyRow>
                  <PropertyRow label="Priority"><span className="inline-flex items-center gap-1.5 text-ui-small"><PriorityIcon priority="high" /> High</span></PropertyRow>
                </>
              }
            />
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-ui-small text-content-tertiary mb-1 font-medium">Milestones</h3>
                <MilestoneRow name="Pooling MVP" done={5} total={6} date="Aug 30" />
                <MilestoneRow name="Prod write-confirm" done={0} total={4} date="Sep 20" />
              </div>
              <div className="border-border-subtle border-t pt-2">
                <h3 className="text-ui-small text-content-tertiary mb-1 font-medium">Updates</h3>
                <ProjectUpdateItem author="Alex" health="on-track" date="2d">
                  Pooling landed; starting the write-confirm gate next.
                </ProjectUpdateItem>
              </div>
            </div>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Cycles"
        description="The active-cycle header and cycle list rows with scope progress."
      >
        <div className="border-border-default bg-surface-panel flex flex-col gap-5 rounded-[var(--radius-panel)] border p-5">
          <ActiveCycleHeader name="Cycle 7" range="Aug 25 – Sep 8" started={4} completed={9} total={20} />
          <div className="divide-border-subtle divide-y border-t border-border-subtle pt-1">
            <CycleRow name="Cycle 6" range="Aug 11 – Aug 25" completed={16} total={18} onClick={() => {}} />
            <CycleRow name="Cycle 7" range="Aug 25 – Sep 8" active started={4} completed={9} total={20} onClick={() => {}} />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Due dates & linked resources"
        description="Target/overdue date pills and attached links (PRs, designs)."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <DueDateBadge date="Sep 30" />
            <DueDateBadge date="Tomorrow" tone="soon" />
            <DueDateBadge date="2d overdue" tone="overdue" />
          </div>
          <div className="flex max-w-lg flex-col gap-2">
            <LinkedResourceRow icon={<Github />} title="feat/connection-pooling #482" context="GitHub · Open" onOpen={() => {}} onRemove={() => {}} />
            <LinkedResourceRow icon={<Figma />} title="Proxy dashboard — v3" context="Figma" onOpen={() => {}} onRemove={() => {}} />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Triage"
        description="The triage inbox row with accept / merge / decline actions."
      >
        <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border px-4">
          <TriageRow id="MOO-42" title="Pool exhausts under burst load" leading={<><PriorityIcon priority="urgent" /><StatusIcon status="backlog" /></>} meta="2h ago" onAccept={() => {}} onMerge={() => {}} onDecline={() => {}} />
          <TriageRow id="MOO-43" title="Typo in connect error message" leading={<><PriorityIcon priority="low" /><StatusIcon status="backlog" /></>} meta="5h ago" onAccept={() => {}} onDecline={() => {}} />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Global search"
        description="Search results composed from CommandMenu + grouped result rows."
      >
        <CommandMenu
          footer={<CommandFooter />}
          input={<input readOnly value="pool" className="text-body min-w-0 flex-1 bg-transparent outline-none [color:var(--content-primary)]" />}
          className="w-[520px]"
        >
          <SearchResultGroup heading="Issues">
            <SearchResultRow icon={<Rocket />} title="Pool exhausts under burst load" context="MOO · Backlog" active />
            <SearchResultRow icon={<Rocket />} title="Add connection-pool metrics" context="MOO · Todo" />
          </SearchResultGroup>
          <SearchResultGroup heading="Projects">
            <SearchResultRow icon={<Layers />} title="Postgres proxy" context="Pooling" />
          </SearchResultGroup>
          <SearchResultGroup heading="Views">
            <SearchResultRow icon={<PanelsTopLeft />} title="Active issues" context="MOO" />
          </SearchResultGroup>
        </CommandMenu>
      </CatalogSection>
    </main>
  );
}
