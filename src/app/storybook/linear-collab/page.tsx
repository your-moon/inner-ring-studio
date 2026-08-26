"use client";

import {
  ActivityFeedItem,
  AttachmentRow,
  Button,
  EmojiPicker,
  HealthBadge,
  InitiativeCard,
  IntegrationRow,
  MentionMenu,
  RoadmapBar,
  SubscriberList,
  TemplatePicker,
} from "@/components/orbit";
import { FileSpreadsheet, GitBranch, Github, Slack } from "lucide-react";
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

export default function LinearCollabStorybook() {
  const [mention, setMention] = useState("a");
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 15
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear collab &amp; projects
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          Mentions, emoji, attachments, activity, subscribers, project health,
          roadmap, initiatives, templates, and integrations.
        </p>
      </header>

      <CatalogSection
        title="Mention & emoji"
        description="The @-mention list and the emoji reaction grid."
      >
        <div className="flex flex-wrap items-start gap-6">
          <MentionMenu
            activeId={mention}
            onSelect={setMention}
            people={[
              { id: "a", name: "Alex" },
              { id: "b", name: "Bru" },
              { id: "c", name: "Cy" },
            ]}
          />
          <div className="flex flex-col gap-2">
            <EmojiPicker onSelect={setPicked} />
            <span className="text-ui-small text-content-tertiary">
              Picked: {picked ?? "—"}
            </span>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Attachments & activity"
        description="File attachment rows; the system activity feed."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <AttachmentRow name="export.csv" size="2.4 MB" icon={<FileSpreadsheet />} onDownload={() => {}} onRemove={() => {}} />
            <AttachmentRow name="schema.sql" size="18 KB" onDownload={() => {}} />
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
            <ActivityFeedItem actor="Alex" time="2h">
              changed status to <b>In Progress</b>
            </ActivityFeedItem>
            <ActivityFeedItem actor="Bru" time="1h">
              added label <b>backend</b>
            </ActivityFeedItem>
            <ActivityFeedItem icon={<GitBranch />} time="30m" last>
              linked branch feat/pooling
            </ActivityFeedItem>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Subscribers, health, roadmap"
        description="Issue subscribers, a project health pill, and the roadmap bar."
      >
        <div className="border-border-default bg-surface-panel flex flex-col gap-4 rounded-[var(--radius-panel)] border p-5">
          <div className="flex items-center gap-6">
            <SubscriberList
              onAdd={() => {}}
              people={[{ name: "Alex" }, { name: "Bru" }, { name: "Cy" }]}
            />
            <HealthBadge health="on-track" />
            <HealthBadge health="at-risk" />
            <HealthBadge health="off-track" />
          </div>
          <RoadmapBar
            label="Postgres proxy"
            done={8}
            total={20}
            start="Aug 1"
            target="Sep 30"
            className="max-w-md"
          />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Initiatives, templates & integrations"
        description="A portfolio initiative card, the template menu, and integration settings rows."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InitiativeCard
            name="Reliability H2"
            health={<HealthBadge health="on-track" />}
            done={12}
            total={30}
            projectCount={4}
          />
          <div className="border-border-default bg-surface-panel flex flex-col gap-3 rounded-[var(--radius-panel)] border p-4">
            <TemplatePicker
              onSelect={() => {}}
              templates={[
                { value: "bug", label: "Bug report", hint: "Repro · expected · actual" },
                { value: "spike", label: "Spike", hint: "Timeboxed investigation" },
              ]}
            />
            <div className="divide-border-subtle divide-y">
              <IntegrationRow
                icon={<Github />}
                name="GitHub"
                description="Link branches and PRs to issues"
                connected
                action={<Button variant="secondary" size="sm" title="Configure" />}
              />
              <IntegrationRow
                icon={<Slack />}
                name="Slack"
                description="Post updates to a channel"
                action={<Button variant="primary" size="sm" title="Connect" />}
              />
            </div>
          </div>
        </div>
      </CatalogSection>
    </main>
  );
}
