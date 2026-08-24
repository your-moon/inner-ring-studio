"use client";

import {
  AspectRatio,
  Center,
  Cluster,
  Container,
  Divider,
  Grid,
  Inline,
  ScrollArea,
  Spacer,
  Stack,
  StatusDot,
  Chip,
  type Gap,
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
      {children}
    </div>
  );
}

function Swatch({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-surface-selected text-ui-caption text-content-tertiary grid h-9 min-w-9 place-items-center rounded-[var(--radius-small)] px-2">
      {children}
    </div>
  );
}

const GAPS: Gap[] = ["xs", "sm", "md", "lg", "xl"];

export default function LayoutStorybook() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 05
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Layout primitives
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Composition on one spacing scale. Stack, Inline, and Grid own the
            gaps so nothing in the product sets an arbitrary margin.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />11 primitives · ready
        </div>
      </header>

      <CatalogSection
        title="Stack — vertical flow"
        description="The default building block. Gap is a step on the 4px scale, not a pixel value."
      >
        <Grid columns={5} gap="md">
          {GAPS.map((gap) => (
            <Card key={gap} label={`gap="${gap}"`}>
              <Stack gap={gap}>
                <Swatch />
                <Swatch />
                <Swatch />
              </Stack>
            </Card>
          ))}
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="Inline — horizontal flow"
        description="Centers on the cross axis; add justify to distribute. Spacer pushes siblings apart."
      >
        <Stack gap="md">
          <Card label="Inline with justify=between + Spacer">
            <Inline justify="between">
              <Chip>left</Chip>
              <Inline gap="sm">
                <Chip>a</Chip>
                <Chip>b</Chip>
              </Inline>
            </Inline>
          </Card>
          <Card label="Spacer pushes the trailing item">
            <Inline>
              <Chip>title</Chip>
              <Spacer />
              <Chip>trailing</Chip>
            </Inline>
          </Card>
        </Stack>
      </CatalogSection>

      <CatalogSection
        title="Cluster — wrapping group"
        description="For a variable number of similar items: chips, tags, applied filters."
      >
        <Card label="Wraps at the container edge">
          <Cluster gap="sm">
            {Array.from({ length: 14 }, (_, i) => (
              <Chip key={i}>tag-{i + 1}</Chip>
            ))}
          </Cluster>
        </Card>
      </CatalogSection>

      <CatalogSection
        title="Grid, Center, Divider & AspectRatio"
        description="Fixed-column grid on the gap scale; Center for both-axis centering; Divider as a hairline; AspectRatio locks media."
      >
        <Grid columns={3} gap="md">
          <Card label="Grid (3 columns)">
            <Grid columns={3} gap="sm">
              {Array.from({ length: 6 }, (_, i) => (
                <Swatch key={i}>{i + 1}</Swatch>
              ))}
            </Grid>
          </Card>
          <Card label="Center">
            <Center className="h-24">
              <Chip>centered</Chip>
            </Center>
          </Card>
          <Card label="Divider — both orientations">
            <Stack gap="sm">
              <span className="text-ui-default">above</span>
              <Divider />
              <span className="text-ui-default">below</span>
              <Inline gap="sm" className="h-6">
                <span className="text-ui-default">left</span>
                <Divider orientation="vertical" />
                <span className="text-ui-default">right</span>
              </Inline>
            </Stack>
          </Card>
          <Card label={'AspectRatio 16:9'}>
            <AspectRatio ratio={16 / 9} className="rounded-[var(--radius-control)]">
              <Center className="bg-surface-selected h-full">
                <span className="text-ui-caption text-content-tertiary">16 : 9</span>
              </Center>
            </AspectRatio>
          </Card>
          <Card label="ScrollArea (maxHeight)">
            <ScrollArea maxHeight={96} className="pr-2">
              <Stack gap="xs">
                {Array.from({ length: 12 }, (_, i) => (
                  <Swatch key={i}>row {i + 1}</Swatch>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
          <Card label="Container">
            <div className="bg-surface-selected rounded-[var(--radius-control)] py-3">
              <Container size="sm" className="px-0">
                <span className="text-ui-caption text-content-tertiary">
                  centered, width-capped
                </span>
              </Container>
            </div>
          </Card>
        </Grid>
      </CatalogSection>
    </main>
  );
}
