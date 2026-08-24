"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
  Stack,
  StatusDot,
  TextField,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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

export default function OverlaysStorybook() {
  return (
    <TooltipProvider>
      <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
        <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
          <div>
            <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
              PMSQL UI / 07
            </div>
            <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
              Overlays
            </h1>
            <p className="text-body text-content-secondary mt-2 max-w-2xl">
              Layered surfaces on the shared overlay tokens—one shadow, one
              radius, one motion. Match the weight of the surface to the weight
              of the task.
            </p>
          </div>
          <div className="text-ui-small text-content-secondary flex items-center gap-2">
            <StatusDot status="live" />5 overlays · ready
          </div>
        </header>

        <CatalogSection
          title="Tooltip & Popover"
          description="Tooltip for a word of help on hover/focus; Popover for a small interactive surface."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Card label="Tooltip">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" title="Hover me" />
                </TooltipTrigger>
                <TooltipContent>Runs the current query (⌘↵)</TooltipContent>
              </Tooltip>
            </Card>
            <Card label="Popover">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" title="Open popover" />
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <Stack gap="sm">
                    <div className="text-ui-default font-[var(--weight-medium)]">
                      Rename connection
                    </div>
                    <Field label="Name">
                      <TextField defaultValue="prod-replica" />
                    </Field>
                  </Stack>
                </PopoverContent>
              </Popover>
            </Card>
          </div>
        </CatalogSection>

        <CatalogSection
          title="Dialog"
          description="A centered modal for a focused task. Overlay dims and blurs; content sits on the panel surface."
        >
          <Card label="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="primary" title="New connection" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New connection</DialogTitle>
                  <DialogDescription>
                    Connect a Postgres, MySQL, or ClickHouse database.
                  </DialogDescription>
                </DialogHeader>
                <Stack gap="md">
                  <Field label="Name">
                    <TextField placeholder="Production replica" />
                  </Field>
                  <Field label="Connection URL">
                    <TextField placeholder="postgres://…" />
                  </Field>
                </Stack>
                <DialogFooter>
                  <Button variant="ghost" title="Cancel" />
                  <Button variant="primary" title="Connect" />
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </CatalogSection>

        <CatalogSection
          title="Sheet"
          description="A side panel for detail or settings that shouldn't take over the screen. Slides from any edge."
        >
          <Card label="Sheet (right)">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" title="Open inspector" />
              </SheetTrigger>
              <SheetContent
                side="right"
                title="Row inspector"
                description="orders · id 4821"
              >
                <Stack gap="md">
                  <Field label="status">
                    <TextField defaultValue="shipped" />
                  </Field>
                  <Field label="total">
                    <TextField defaultValue="149.00" />
                  </Field>
                </Stack>
              </SheetContent>
            </Sheet>
          </Card>
        </CatalogSection>

        <CatalogSection
          title="Alert dialog"
          description="A blocking confirm for consequential, hard-to-undo actions. Destructive by default."
        >
          <Card label="Destructive confirm">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" title="Drop table" />
              </AlertDialogTrigger>
              <AlertDialogContent
                title="Drop table “orders”?"
                description="This permanently deletes the table and all 48,210 rows. This can't be undone."
                confirmLabel="Drop table"
                cancelLabel="Keep it"
              />
            </AlertDialog>
          </Card>
        </CatalogSection>
      </main>
    </TooltipProvider>
  );
}
