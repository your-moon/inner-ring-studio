"use client";

import {
  BlockHandle,
  CodeBlockHeader,
  CopyButton,
  EditorPlaceholder,
  EditorToolbarButton,
  FloatingFormatToolbar,
  LinkPopover,
  ListBlock,
  QuoteBlock,
  TodoItem,
  ToggleBlock,
  ToolbarDivider,
} from "@/components/orbit";
import {
  Code,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Quotes,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
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

export default function LinearEditorStorybook() {
  const [link, setLink] = useState("https://");
  const [todos, setTodos] = useState({ a: true, b: false, c: false });

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 19
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear rich-text editor
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          The floating format toolbar, link popover, block handle, and document
          block types (quote, toggle, to-do, lists, code header) — modelled on
          Linear&apos;s document editor.
        </p>
      </header>

      <CatalogSection
        title="Floating toolbar & link"
        description="The selection format bar and the link editor popover."
      >
        <div className="flex flex-wrap items-start gap-6">
          <FloatingFormatToolbar>
            <EditorToolbarButton aria-label="Bold" active>
              <TextB />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Italic">
              <TextItalic />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Strikethrough">
              <TextStrikethrough />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Code">
              <Code />
            </EditorToolbarButton>
            <ToolbarDivider />
            <EditorToolbarButton aria-label="Heading 1">
              <TextHOne />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Heading 2">
              <TextHTwo />
            </EditorToolbarButton>
            <ToolbarDivider />
            <EditorToolbarButton aria-label="Quote">
              <Quotes />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Bulleted list">
              <ListBullets />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Numbered list">
              <ListNumbers />
            </EditorToolbarButton>
            <EditorToolbarButton aria-label="Link">
              <LinkSimple />
            </EditorToolbarButton>
          </FloatingFormatToolbar>
          <LinkPopover
            value={link}
            onChange={setLink}
            onApply={() => {}}
            onRemove={() => setLink("")}
          />
        </div>
      </CatalogSection>

      <CatalogSection
        title="Document blocks"
        description="Quote, collapsible toggle, to-dos, lists, and a code-block header."
      >
        <div className="border-border-default bg-surface-panel flex max-w-2xl flex-col gap-4 rounded-[var(--radius-panel)] border p-5">
          <div className="group/block flex items-start gap-1">
            <BlockHandle onInsert={() => {}} className="mt-0.5" />
            <p className="text-body flex-1 [color:var(--content-primary)]">
              Hover this paragraph to reveal the insert / drag handle in the gutter.
            </p>
          </div>

          <QuoteBlock>
            The spec is the baseline, not the finish line.
          </QuoteBlock>

          <ToggleBlock summary="Implementation notes" defaultOpen>
            Pooling uses a bounded semaphore; see the proxy design doc.
          </ToggleBlock>

          <div className="flex flex-col gap-1">
            <TodoItem checked={todos.a} onCheckedChange={(v) => setTodos((t) => ({ ...t, a: v }))}>
              Wire the connection pool
            </TodoItem>
            <TodoItem checked={todos.b} onCheckedChange={(v) => setTodos((t) => ({ ...t, b: v }))}>
              Add prod write-confirm
            </TodoItem>
            <TodoItem checked={todos.c} onCheckedChange={(v) => setTodos((t) => ({ ...t, c: v }))}>
              Backfill tests
            </TodoItem>
          </div>

          <ListBlock>
            <li>Postgres</li>
            <li>MySQL</li>
            <li>ClickHouse</li>
          </ListBlock>

          <ListBlock ordered>
            <li>Connect</li>
            <li>Query</li>
            <li>Inspect</li>
          </ListBlock>

          <div>
            <CodeBlockHeader
              language="sql"
              action={<CopyButton value="select 1;" />}
            />
            <pre className="border-border-subtle bg-surface-canvas overflow-x-auto rounded-b-[var(--radius-control)] border p-3 font-mono text-[13px] [color:var(--content-primary)]">
              select 1;
            </pre>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Empty editor"
        description="The placeholder shown in an empty description."
      >
        <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
          <EditorPlaceholder />
        </div>
      </CatalogSection>
    </main>
  );
}
