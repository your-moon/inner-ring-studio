"use client";

import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardContent,
  PageHeader,
  Pagination,
  SegmentedControl,
  StatusDot,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
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

export default function NavigationStorybook() {
  const [view, setView] = useState<"table" | "json" | "chart">("table");
  const [page, setPage] = useState(3);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 09
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Navigation
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            Moving between places and views: tabs, segmented switches,
            breadcrumbs, pagination, and the standard page header.
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />6 patterns · ready
        </div>
      </header>

      <CatalogSection
        title="Page header"
        description="The standard page top: breadcrumb, title + description, and the primary actions."
      >
        <Card>
          <CardContent>
            <PageHeader
              breadcrumb={
                <Breadcrumb>
                  <BreadcrumbItem href="/">Connections</BreadcrumbItem>
                  <BreadcrumbItem href="/">Production replica</BreadcrumbItem>
                  <BreadcrumbItem current>public.orders</BreadcrumbItem>
                </Breadcrumb>
              }
              title="public.orders"
              description="48,210 rows · 12 columns"
              actions={
                <>
                  <Button variant="ghost" title="Export" />
                  <Button variant="primary" title="Run query" />
                </>
              }
            />
          </CardContent>
        </Card>
      </CatalogSection>

      <CatalogSection
        title="Tabs"
        description="Switch between panels in place. The selected tab carries the accent underline; panels are proper tabpanels."
      >
        <Card>
          <CardContent>
            <Tabs defaultValue="columns">
              <TabList>
                <Tab value="columns">Columns</Tab>
                <Tab value="data">Data</Tab>
                <Tab value="indexes">Indexes</Tab>
                <Tab value="relations">Relations</Tab>
              </TabList>
              <TabPanel value="columns">
                <span className="text-ui-default text-content-secondary">
                  12 columns — id, email, total, created_at…
                </span>
              </TabPanel>
              <TabPanel value="data">
                <span className="text-ui-default text-content-secondary">
                  The first 100 rows of the table.
                </span>
              </TabPanel>
              <TabPanel value="indexes">
                <span className="text-ui-default text-content-secondary">
                  2 indexes — orders_pkey, orders_user_id_idx.
                </span>
              </TabPanel>
              <TabPanel value="relations">
                <span className="text-ui-default text-content-secondary">
                  1 foreign key → users(id).
                </span>
              </TabPanel>
            </Tabs>
          </CardContent>
        </Card>
      </CatalogSection>

      <CatalogSection
        title="Segmented control"
        description="A compact single-select switch. One option is always active; use it for a view or mode toggle."
      >
        <Stack gap="md">
          <SegmentedControl
            aria-label="Result view"
            value={view}
            onChange={setView}
            options={[
              { value: "table", label: "Table" },
              { value: "json", label: "JSON" },
              { value: "chart", label: "Chart" },
            ]}
          />
          <span className="text-ui-small text-content-tertiary">
            Showing the <Badge intent="neutral" size="sm">{view}</Badge> view.
          </span>
        </Stack>
      </CatalogSection>

      <CatalogSection
        title="Pagination"
        description="Move through pages of results; the current page is marked and ends are always reachable."
      >
        <Stack gap="md">
          <Pagination page={page} pageCount={24} onPageChange={setPage} />
          <span className="text-ui-small text-content-tertiary">
            Page {page} of 24
          </span>
        </Stack>
      </CatalogSection>
    </main>
  );
}
