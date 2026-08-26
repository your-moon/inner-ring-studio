"use client";

import {
  Button,
  ColorSwatchPicker,
  IconButton,
  LabelForm,
  LabelGroupRow,
  LabelRow,
  SettingsList,
  SettingsListHeader,
  StatusEditorPanel,
  StatusTypeSection,
  TemplateRow,
  WorkflowStatusRow,
  type LabelColor,
} from "@/components/orbit";
import { Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
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

const rowActions = (
  <>
    <IconButton aria-label="Edit" size="sm">
      <Pencil />
    </IconButton>
    <IconButton aria-label="Delete" size="sm" variant="destructive">
      <Trash2 />
    </IconButton>
  </>
);

export default function LinearSettingsStorybook() {
  const [color, setColor] = useState<LabelColor>("indigo");
  const [name, setName] = useState("Regression");

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 18
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear settings: labels &amp; statuses
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          Workspace label rows and groups, the fixed colour palette, the label
          form, the workflow-status list, and template rows — ground-truthed on
          linear.app/settings/labels (44px rows · 9px dots · palette verified).
        </p>
      </header>

      <CatalogSection
        title="Labels"
        description="Label rows, a collapsible group, and the colour palette / create form."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border px-4">
            <SettingsList
              header={
                <SettingsListHeader
                  title="Labels"
                  count={5}
                  action={
                    <Button variant="secondary" size="sm" title="New label">
                      <Plus />
                    </Button>
                  }
                />
              }
            >
              <LabelRow name="Bug" color="red" description="Something is broken" meta="Updated 2d ago" actions={rowActions} />
              <LabelRow name="Feature" color="blue" description="New capability" meta="Aug 12" actions={rowActions} />
              <LabelGroupRow name="Priority" color="amber" count={2} onAdd={() => {}}>
                <LabelRow name="Urgent" color="orange" actions={rowActions} />
                <LabelRow name="Low" color="gray" actions={rowActions} />
              </LabelGroupRow>
            </SettingsList>
          </div>
          <LabelForm
            name={name}
            onNameChange={setName}
            color={color}
            onColorChange={setColor}
            onSubmit={() => {}}
            onCancel={() => {}}
          />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Palette"
        description="The fixed label colour palette (red & blue verified identical to Linear)."
      >
        <ColorSwatchPicker value={color} onChange={setColor} />
      </CatalogSection>

      <CatalogSection
        title="Workflow statuses"
        description="Linear's current card editor: a 640px / 10px-radius panel of type sections; each status is a 36px raised card (6px radius) with a shape-first icon, draggable."
      >
        <StatusEditorPanel>
          <StatusTypeSection type="backlog" onAdd={() => {}}>
            <WorkflowStatusRow name="Backlog" status="backlog" count={12} />
          </StatusTypeSection>
          <StatusTypeSection type="unstarted" onAdd={() => {}}>
            <WorkflowStatusRow name="Todo" status="todo" count={4} />
          </StatusTypeSection>
          <StatusTypeSection type="started" onAdd={() => {}}>
            <WorkflowStatusRow name="In Progress" status="started" description="Actively worked on" count={3} />
          </StatusTypeSection>
          <StatusTypeSection type="completed" onAdd={() => {}}>
            <WorkflowStatusRow name="Done" status="done" count={87} />
          </StatusTypeSection>
          <StatusTypeSection type="cancelled" onAdd={() => {}}>
            <WorkflowStatusRow name="Canceled" status="cancelled" count={9} />
          </StatusTypeSection>
        </StatusEditorPanel>
      </CatalogSection>

      <CatalogSection
        title="Templates"
        description="Issue / project template rows with description and updated meta."
      >
        <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border px-4">
          <SettingsList>
            <TemplateRow name="Bug report" description="Repro · expected · actual" meta="Updated by Alex · 3d" actions={<IconButton aria-label="Template options" size="sm"><Ellipsis /></IconButton>} onClick={() => {}} />
            <TemplateRow name="Spike" description="Timeboxed investigation" meta="Aug 9" actions={<IconButton aria-label="Template options" size="sm"><Ellipsis /></IconButton>} onClick={() => {}} />
          </SettingsList>
        </div>
      </CatalogSection>
    </main>
  );
}
