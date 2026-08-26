"use client";

import {
  Button,
  Card,
  CardContent,
  EmptyIllustration,
  Grid,
  OrbitIllustration,
  StatusDot,
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

/** A small labelled stage that shows a drawing centered on a panel surface. */
function Stage({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-surface-panel border-border-default flex flex-col items-center justify-center gap-4 rounded-[var(--radius-panel)] border p-8">
      <div className="flex min-h-[140px] items-center justify-center">
        {children}
      </div>
      <span className="text-ui-caption text-content-tertiary tracking-[0.06em] uppercase">
        {label}
      </span>
    </div>
  );
}

export default function IllustrationsStorybook() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 22
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Illustrations
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Reusable hairline line-art for hero and empty states. Every stroke is{" "}
            <code className="text-ui-small">currentColor</code> defaulting to{" "}
            <code className="text-ui-small">--content-tertiary</code>, with no
            fills — so the drawings theme in light and dark and dissolve into a
            soft mirrored reflection.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />2 illustrations · ready
        </div>
      </header>

      <CatalogSection
        title="The motifs"
        description="Drawn once from a shared glyph in <defs>, then instanced a second time — flipped about a baseline and faded through a luminance mask — for the reflection."
      >
        <Grid columns={2} gap="md">
          <Stage label="OrbitIllustration">
            <OrbitIllustration size={168} title="Assembling orbit" />
          </Stage>
          <Stage label="EmptyIllustration">
            <EmptyIllustration size={168} title="Empty tray" />
          </Stage>
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="Sizes"
        description="A single size prop scales the whole drawing; the stroke stays hairline because it is expressed in the viewBox and rides the same transform."
      >
        <Stage label="size = 72 / 108 / 144">
          <div className="flex items-end gap-10">
            <OrbitIllustration size={72} />
            <OrbitIllustration size={108} />
            <OrbitIllustration size={144} />
          </div>
        </Stage>
      </CatalogSection>

      <CatalogSection
        title="Retinting"
        description="Because the ink is currentColor, a text-color utility on className recolours the entire illustration — useful for muted or accent contexts."
      >
        <Grid columns={3} gap="md">
          <Stage label="default">
            <OrbitIllustration size={120} />
          </Stage>
          <Stage label="text-content-secondary">
            <OrbitIllustration size={120} className="text-content-secondary" />
          </Stage>
          <Stage label="text-content-link">
            <OrbitIllustration size={120} className="text-content-link" />
          </Stage>
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="In an empty-state card"
        description="How the empty illustration reads in context: centered above a one-line message and a recovery action."
      >
        <Grid columns={2} gap="md">
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <EmptyIllustration size={132} />
                <div className="flex flex-col gap-1">
                  <p className="text-ui-default font-[var(--weight-medium)]">
                    No connections yet
                  </p>
                  <p className="text-ui-small text-content-tertiary max-w-xs">
                    Add a Postgres, MySQL, or ClickHouse database to start
                    querying.
                  </p>
                </div>
                <Button variant="secondary" size="sm">
                  New connection
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <OrbitIllustration size={132} />
                <div className="flex flex-col gap-1">
                  <p className="text-ui-default font-[var(--weight-medium)]">
                    Setting up your workspace
                  </p>
                  <p className="text-ui-small text-content-tertiary max-w-xs">
                    We are assembling the pieces. This only takes a moment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </CatalogSection>
    </main>
  );
}
