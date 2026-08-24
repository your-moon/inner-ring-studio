"use client";

import {
  Button,
  ButtonGroup,
  ButtonGroupItem,
  CopyButton,
  DropdownMenuItem,
  IconButton,
  SplitButton,
  StatusDot,
  ToggleGroup,
  ToggleGroupItem,
  type ButtonVariant,
  type IconButtonVariant,
} from "@/components/orbit";
import {
  ArrowRight,
  ChartBar,
  DotsThree,
  FloppyDisk,
  Funnel,
  ListBullets,
  Plus,
  Rows,
  SlidersHorizontal,
  Trash,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";

const TEXT_VARIANTS = [
  { variant: "primary", label: "Create", icon: Plus },
  { variant: "secondary", label: "Save", icon: FloppyDisk },
  { variant: "ghost", label: "Filter", icon: Funnel },
  { variant: "destructive", label: "Delete", icon: Trash },
] as const satisfies readonly {
  variant: ButtonVariant;
  label: string;
  icon: typeof Plus;
}[];

const ICON_VARIANTS = [
  { variant: "ghost", label: "Ghost" },
  { variant: "secondary", label: "Secondary" },
  { variant: "primary", label: "Primary" },
  { variant: "destructive", label: "Destructive" },
] as const satisfies readonly {
  variant: IconButtonVariant;
  label: string;
}[];

const FAMILY_COVERAGE = [
  ["Button", "<Button>", "Text action; secondary is the default variant"],
  ["IconButton", "<IconButton>", "Icon-only; aria-label required"],
  ["ButtonGroup", "<ButtonGroup>", "Segmented, exactly one selected"],
  ["ToggleGroup", "<ToggleGroup>", "Independent on/off options in one frame"],
  ["SplitButton", "<SplitButton>", "Primary action plus related-actions menu"],
  ["CopyButton", "<CopyButton>", "Clipboard write with announced confirmation"],
  ["ToggleButton", "<Button toggled>", "aria-pressed; IconButton takes toggled too"],
  ["LinkButton", '<Button as="link">', "Renders next/link, keeps button styling"],
  ["LoadingButton", "<Button loading>", "Width-stable loader, aria-busy, sr-only status"],
  ["DangerButton", '<Button variant="destructive">', "Red is reserved for data loss"],
  [
    "FloatingActionButton",
    "—",
    "Intentionally omitted: PRODUCT.md lists FABs as an anti-reference",
  ],
] as const;

function ShowcaseCard({
  name,
  api,
  note,
  children,
}: {
  name: string;
  api: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border-default bg-surface-panel flex flex-col gap-4 rounded-[var(--radius-panel)] border p-5">
      <div className="flex min-h-16 flex-1 items-center justify-center">
        {children}
      </div>
      <div className="border-border-subtle border-t pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <code className="text-ui-small font-mono">{name}</code>
          <code className="text-ui-caption text-content-tertiary font-mono">
            {api}
          </code>
        </div>
        <p className="text-ui-caption text-content-tertiary mt-1">{note}</p>
      </div>
    </div>
  );
}

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

function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border-border-default overflow-x-auto rounded-[var(--radius-panel)] border">
      {children}
    </div>
  );
}

function TableHeading({ children }: { children: ReactNode }) {
  return (
    <th className="text-ui-caption text-content-tertiary bg-surface-canvas h-9 px-4 text-left font-[var(--weight-medium)] whitespace-nowrap">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td className="border-border-subtle h-[72px] border-t px-4 whitespace-nowrap">
      {children}
    </td>
  );
}

export default function ButtonStorybook() {
  const [iconToggled, setIconToggled] = useState(true);
  const [view, setView] = useState("list");
  const [columns, setColumns] = useState(["type", "nullable"]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 02
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Button family
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Text, icon, toggle, link, grouped, and split actions—one compact
            interaction system with consistent states and semantics.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />
          8 button types · ready
        </div>
      </header>

      <CatalogSection
        title="Text buttons"
        description="Every visual variant across its common content and lifecycle states. Hover and keyboard focus are live."
      >
        <TableFrame>
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <TableHeading>Variant</TableHeading>
                <TableHeading>Label</TableHeading>
                <TableHeading>Leading icon</TableHeading>
                <TableHeading>Trailing icon</TableHeading>
                <TableHeading>Loading</TableHeading>
                <TableHeading>Disabled</TableHeading>
              </tr>
            </thead>
            <tbody className="bg-surface-panel">
              {TEXT_VARIANTS.map(({ variant, label, icon: Icon }) => (
                <tr key={variant}>
                  <TableCell>
                    <div>
                      <div className="text-ui-small font-medium capitalize">
                        {variant}
                      </div>
                      <code className="text-ui-caption text-content-tertiary font-mono">
                        {variant}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant={variant}>{label}</Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={variant}
                      title={label}
                      displayContent="items-first"
                    >
                      <Icon weight="bold" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant={variant} title={label}>
                      <ArrowRight weight="bold" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={variant}
                      title={label}
                      loading
                      loadingLabel={`${label} in progress`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant={variant} disabled>
                      {label}
                    </Button>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      </CatalogSection>

      <CatalogSection
        title="Sizes"
        description="The 28/32/36px ladder maps to dense toolbars, default product actions, and comfortable dialog actions."
      >
        <TableFrame>
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <TableHeading>Size</TableHeading>
                <TableHeading>Height</TableHeading>
                <TableHeading>Text</TableHeading>
                <TableHeading>With icon</TableHeading>
                <TableHeading>Use</TableHeading>
              </tr>
            </thead>
            <tbody className="bg-surface-panel">
              {[
                ["sm", "28px", "12 / 16", "Dense toolbars"],
                ["base", "32px", "13 / 20", "Default actions"],
                ["lg", "36px", "13 / 20", "Dialogs and forms"],
              ].map(([size, height, text, usage]) => (
                <tr key={size}>
                  <TableCell>
                    <code className="text-ui-small font-mono">{size}</code>
                  </TableCell>
                  <TableCell>
                    <code className="text-ui-small text-content-tertiary font-mono">
                      {height}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-ui-small text-content-tertiary font-mono">
                      {text}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Button
                      size={size as "sm" | "base" | "lg"}
                      title="Run query"
                    >
                      <ArrowRight weight="bold" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span className="text-ui-small text-content-secondary">
                      {usage}
                    </span>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      </CatalogSection>

      <CatalogSection
        title="Icon buttons"
        description="Icon-only actions are quiet by default, always have an accessible name, and pair with a tooltip in product UI."
      >
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <TableFrame>
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <TableHeading>Variant</TableHeading>
                  <TableHeading>Default</TableHeading>
                  <TableHeading>Active</TableHeading>
                  <TableHeading>Disabled</TableHeading>
                </tr>
              </thead>
              <tbody className="bg-surface-panel">
                {ICON_VARIANTS.map(({ variant, label }) => (
                  <tr key={variant}>
                    <TableCell>
                      <span className="text-ui-small">{label}</span>
                    </TableCell>
                    <TableCell>
                      <IconButton aria-label={`${label} settings`} variant={variant}>
                        <SlidersHorizontal />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        aria-label={`${label} settings active`}
                        variant={variant}
                        toggled
                      >
                        <SlidersHorizontal />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        aria-label={`${label} settings disabled`}
                        variant={variant}
                        disabled
                      >
                        <SlidersHorizontal />
                      </IconButton>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>

          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-5">
            <div className="text-ui-small mb-4 font-medium">Size ladder</div>
            <div className="flex items-end gap-5">
              {(["sm", "base", "lg"] as const).map((size) => (
                <div key={size} className="text-center">
                  <IconButton aria-label={`${size} more actions`} size={size}>
                    <DotsThree weight="bold" />
                  </IconButton>
                  <code className="text-ui-caption text-content-tertiary mt-2 block font-mono">
                    {size}
                  </code>
                </div>
              ))}
            </div>
            <div className="border-border-subtle mt-5 border-t pt-5">
              <div className="text-ui-caption text-content-tertiary mb-2">
                Interactive toggle
              </div>
              <IconButton
                aria-label="Toggle inspector"
                toggled={iconToggled}
                onClick={() => setIconToggled((value) => !value)}
              >
                <SlidersHorizontal />
              </IconButton>
            </div>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Compound buttons"
        description="Grouped choices and split actions keep related commands together without inventing new visual rules."
      >
        <div className="border-border-default bg-surface-panel grid gap-8 rounded-[var(--radius-panel)] border p-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <div className="text-ui-small font-medium">Segmented group</div>
            <p className="text-ui-caption text-content-tertiary mt-0.5 mb-4">
              One selected view; each item exposes aria-pressed.
            </p>
            <ButtonGroup aria-label="Result layout">
              <ButtonGroupItem
                selected={view === "list"}
                onClick={() => setView("list")}
              >
                <ListBullets /> List
              </ButtonGroupItem>
              <ButtonGroupItem
                selected={view === "rows"}
                onClick={() => setView("rows")}
              >
                <Rows /> Rows
              </ButtonGroupItem>
              <ButtonGroupItem
                selected={view === "chart"}
                onClick={() => setView("chart")}
              >
                <ChartBar /> Chart
              </ButtonGroupItem>
            </ButtonGroup>
          </div>

          <div>
            <div className="text-ui-small font-medium">Split action</div>
            <p className="text-ui-caption text-content-tertiary mt-0.5 mb-4">
              Main action plus a separately focusable related-actions menu.
            </p>
            <SplitButton
              title="Save view"
              menuLabel="More save options"
              menu={
                <>
                  <DropdownMenuItem>Save as new view</DropdownMenuItem>
                  <DropdownMenuItem>Update current view</DropdownMenuItem>
                  <DropdownMenuItem>Copy link to view</DropdownMenuItem>
                </>
              }
            >
              <FloppyDisk weight="bold" />
            </SplitButton>
          </div>

          <div>
            <div className="text-ui-small font-medium">Toggle group</div>
            <p className="text-ui-caption text-content-tertiary mt-0.5 mb-4">
              Independent on/off options; roving focus with arrow keys.
            </p>
            <ToggleGroup
              type="multiple"
              aria-label="Visible columns"
              value={columns}
              onValueChange={setColumns}
            >
              <ToggleGroupItem value="type">Type</ToggleGroupItem>
              <ToggleGroupItem value="nullable">Nullable</ToggleGroupItem>
              <ToggleGroupItem value="default">Default</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Semantic actions"
        description="The same primitive covers navigation, toggle state, asynchronous work, and transient confirmation without changing its grammar."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
            <div className="text-ui-caption text-content-tertiary mb-3">Link</div>
            <Button
              as="link"
              href="/storybook/foundations"
              variant="ghost"
              title="Foundations"
            >
              <ArrowRight />
            </Button>
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
            <div className="text-ui-caption text-content-tertiary mb-3">
              Toggle
            </div>
            <Button title="Inspector" toggled>
              <SlidersHorizontal />
            </Button>
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
            <div className="text-ui-caption text-content-tertiary mb-3">
              Loading
            </div>
            <Button title="Run query" loading loadingLabel="Running query" />
          </div>
          <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border p-4">
            <div className="text-ui-caption text-content-tertiary mb-3">
              Confirmation
            </div>
            <CopyButton
              value="select * from public.orders limit 100;"
              label="Copy SQL"
            />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Family showcase"
        description="Every member of the family, rendered live. Six real components; the rest are presets of Button that need no separate implementation."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShowcaseCard
            name="Button"
            api="<Button>"
            note="Text action; secondary is the default"
          >
            <Button variant="primary" title="Create">
              <Plus weight="bold" />
            </Button>
          </ShowcaseCard>

          <ShowcaseCard
            name="IconButton"
            api="<IconButton>"
            note="Icon-only; aria-label required"
          >
            <IconButton aria-label="More actions">
              <DotsThree weight="bold" />
            </IconButton>
          </ShowcaseCard>

          <ShowcaseCard
            name="ButtonGroup"
            api="<ButtonGroup>"
            note="Segmented, exactly one selected"
          >
            <ButtonGroup aria-label="Layout">
              <ButtonGroupItem selected>
                <ListBullets /> List
              </ButtonGroupItem>
              <ButtonGroupItem>
                <Rows /> Rows
              </ButtonGroupItem>
            </ButtonGroup>
          </ShowcaseCard>

          <ShowcaseCard
            name="ToggleGroup"
            api="<ToggleGroup>"
            note="Independent on/off options in one frame"
          >
            <ToggleGroup
              type="multiple"
              aria-label="Columns"
              defaultValue={["type"]}
            >
              <ToggleGroupItem value="type">Type</ToggleGroupItem>
              <ToggleGroupItem value="nullable">Nullable</ToggleGroupItem>
            </ToggleGroup>
          </ShowcaseCard>

          <ShowcaseCard
            name="SplitButton"
            api="<SplitButton>"
            note="Primary action plus related-actions menu"
          >
            <SplitButton
              title="Save view"
              menuLabel="More save options"
              menu={
                <>
                  <DropdownMenuItem>Save as new view</DropdownMenuItem>
                  <DropdownMenuItem>Update current view</DropdownMenuItem>
                </>
              }
            >
              <FloppyDisk weight="bold" />
            </SplitButton>
          </ShowcaseCard>

          <ShowcaseCard
            name="CopyButton"
            api="<CopyButton>"
            note="Clipboard write with announced confirmation"
          >
            <CopyButton value="select 1;" label="Copy SQL" />
          </ShowcaseCard>

          <ShowcaseCard
            name="ToggleButton"
            api="<Button toggled>"
            note="aria-pressed; IconButton takes toggled too"
          >
            <Button title="Inspector" toggled>
              <SlidersHorizontal />
            </Button>
          </ShowcaseCard>

          <ShowcaseCard
            name="LinkButton"
            api={'<Button as="link">'}
            note="Renders next/link, keeps button styling"
          >
            <Button
              as="link"
              href="/storybook/foundations"
              variant="ghost"
              title="Foundations"
            >
              <ArrowRight />
            </Button>
          </ShowcaseCard>

          <ShowcaseCard
            name="LoadingButton"
            api="<Button loading>"
            note="Width-stable loader, aria-busy, sr-only status"
          >
            <Button title="Run query" loading loadingLabel="Running query" />
          </ShowcaseCard>

          <ShowcaseCard
            name="DangerButton"
            api={'<Button variant="destructive">'}
            note="Red is reserved for data loss"
          >
            <Button variant="destructive" title="Delete">
              <Trash weight="bold" />
            </Button>
          </ShowcaseCard>

          <ShowcaseCard
            name="FloatingActionButton"
            api="—"
            note="Omitted: PRODUCT.md lists FABs as an anti-reference"
          >
            <span className="text-content-tertiary text-ui-small border-border-default rounded-[var(--radius-control)] border border-dashed px-3 py-2">
              Not built
            </span>
          </ShowcaseCard>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Family coverage"
        description="Every action type on the library inventory, and the API that provides it. Where a name is only a preset of Button, it stays a preset — the family has one implementation."
      >
        <TableFrame>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <TableHeading>Inventory name</TableHeading>
                <TableHeading>Provided by</TableHeading>
                <TableHeading>Notes</TableHeading>
              </tr>
            </thead>
            <tbody className="bg-surface-panel">
              {FAMILY_COVERAGE.map(([name, api, note]) => (
                <tr key={name}>
                  <TableCell>
                    <code className="text-ui-small font-mono">{name}</code>
                  </TableCell>
                  <TableCell>
                    <code className="text-ui-small text-content-secondary font-mono">
                      {api}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-ui-small text-content-tertiary">
                      {note}
                    </span>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      </CatalogSection>

      <CatalogSection
        title="Component contract"
        description="These rules apply to every member of the family."
      >
        <dl className="border-border-default bg-surface-raised grid gap-x-8 gap-y-5 rounded-[var(--radius-panel)] border p-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Typography", "Inter Variable · 12/13px · weight 500"],
            ["Primary", "Linear indigo #5E6AD2; one primary per action area"],
            ["Focus", "Visible 3px semantic halo for keyboard navigation"],
            ["Motion", "140ms color and press feedback; reduced-motion safe"],
            ["Loading", "Stable width, aria-busy, and announced progress"],
            ["Icon only", "Accessible name is required; tooltip is visible help"],
          ].map(([term, detail]) => (
            <div key={term}>
              <dt className="text-ui-small font-medium">{term}</dt>
              <dd className="text-ui-caption text-content-tertiary mt-0.5">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </CatalogSection>
    </main>
  );
}
