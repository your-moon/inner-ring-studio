"use client";

import {
  Badge,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Code,
  CodeBlock,
  DescriptionItem,
  DescriptionList,
  Grid,
  Inline,
  KeyValue,
  List,
  ListItem,
  RelativeTime,
  Stat,
  StatusDot,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Timeline,
  TimelineItem,
  Timestamp,
  Tree,
  TreeItem,
  TruncatedText,
  type SortDirection,
} from "@/components/orbit";
import {
  Database,
  FolderSimple,
  Table as TableIcon,
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

// Fixed reference instant so RelativeTime renders deterministically here.
const NOW = new Date("2026-08-24T12:00:00Z").getTime();
const HOUR = 3600 * 1000;

const COLUMNS = [
  { name: "id", type: "int4", nullable: false, rows: "4821" },
  { name: "email", type: "text", nullable: false, rows: "a@ex.com" },
  { name: "total", type: "numeric", nullable: true, rows: "149.00" },
];

export default function DataDisplayStorybook() {
  const [sort, setSort] = useState<{ key: string; dir: SortDirection }>({
    key: "name",
    dir: "asc",
  });
  const rows = [...COLUMNS].sort((a, b) => {
    if (!sort.dir) return 0;
    const av = String(a[sort.key as keyof typeof a]);
    const bv = String(b[sort.key as keyof typeof b]);
    return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const sortFor = (key: string): SortDirection =>
    sort.key === key ? sort.dir : false;
  const toggleSort = (key: string) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
            PMSQL UI / 08
          </div>
          <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
            Data display
          </h1>
          <p className="text-body text-content-secondary mt-2 max-w-2xl">
            The surfaces that present records: cards, stats, property lists, and
            the small typographic primitives (code, timestamps, truncation).
          </p>
        </div>
        <div className="text-ui-small text-content-secondary flex items-center gap-2">
          <StatusDot status="live" />9 primitives · ready
        </div>
      </header>

      <CatalogSection
        title="Card"
        description="A bounded content surface. Flat (hairline) by default; raised only when it floats above the plane."
      >
        <Grid columns={3} gap="md">
          <Card>
            <CardHeader>
              <CardTitle>Production replica</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack gap="sm">
                <KeyValue label="Host">db.internal:5432</KeyValue>
                <KeyValue label="Pool">8 / 20</KeyValue>
              </Stack>
            </CardContent>
            <CardFooter>
              <StatusDot status="live" />
              <span className="text-ui-small text-content-secondary">
                Connected
              </span>
            </CardFooter>
          </Card>
          <Card elevation="raised">
            <CardContent>
              <Stat label="Rows scanned" value="48,210" trend={{ direction: "up", label: "12%" }} hint="last 24h" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stack gap="sm">
                <div className="text-ui-default font-[var(--weight-medium)]">
                  Flat card
                </div>
                <p className="text-ui-small text-content-tertiary">
                  Hairline border, panel surface. The default.
                </p>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="Stat"
        description="A headline metric: quiet label, tabular value, optional trend."
      >
        <Card>
          <CardContent>
            <Grid columns={4} gap="lg">
              <Stat label="Connections" value="12" />
              <Stat label="Queries today" value="1,204" trend={{ direction: "up", label: "8%" }} />
              <Stat label="Avg latency" value="42ms" trend={{ direction: "down", label: "5ms" }} />
              <Stat label="Failed" value="3" hint="last hour" />
            </Grid>
          </CardContent>
        </Card>
      </CatalogSection>

      <CatalogSection
        title="Description list — the row inspector"
        description="Term/detail pairs. Inline packs them two-up for a dense inspector; stacked reads as a form summary."
      >
        <Grid columns={2} gap="md">
          <Card>
            <CardHeader>
              <CardTitle>Inline</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList inline>
                <DescriptionItem term="id">
                  <Code>4821</Code>
                </DescriptionItem>
                <DescriptionItem term="status">
                  <Badge intent="success">shipped</Badge>
                </DescriptionItem>
                <DescriptionItem term="customer">
                  <TruncatedText>
                    a-very-long-customer-identifier-that-overflows@example.com
                  </TruncatedText>
                </DescriptionItem>
                <DescriptionItem term="total">$149.00</DescriptionItem>
                <DescriptionItem term="created">
                  <Timestamp date={NOW - 26 * HOUR} withTime />
                </DescriptionItem>
              </DescriptionList>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stacked</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList>
                <DescriptionItem term="Connection name">
                  Production replica
                </DescriptionItem>
                <DescriptionItem term="Dialect">PostgreSQL 16</DescriptionItem>
                <DescriptionItem term="Environment">
                  <Badge intent="warning">production</Badge>
                </DescriptionItem>
              </DescriptionList>
            </CardContent>
          </Card>
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="List, Code & time"
        description="A divided list; inline code for identifiers; absolute and relative time with a machine-readable value."
      >
        <Grid columns={2} gap="md">
          <Card>
            <CardHeader>
              <CardTitle>Recent queries</CardTitle>
            </CardHeader>
            <CardContent>
              <List>
                {[
                  { sql: "select * from orders limit 100", at: NOW - 2 * HOUR },
                  { sql: "update users set plan = 'pro'", at: NOW - 26 * HOUR },
                  { sql: "select count(*) from events", at: NOW - 200 * HOUR },
                ].map((q) => (
                  <ListItem
                    key={q.sql}
                    trailing={<RelativeTime date={q.at} now={NOW} />}
                  >
                    <Code>{q.sql}</Code>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Time & metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack gap="sm">
                <Inline gap="md" wrap>
                  <KeyValue label="Rows">48,210</KeyValue>
                  <KeyValue label="Took">42 ms</KeyValue>
                  <KeyValue label="Size">2.4 MB</KeyValue>
                </Inline>
                <div className="text-ui-small">
                  Absolute: <Timestamp date={NOW - 26 * HOUR} withTime />
                </div>
                <div className="text-ui-small">
                  Relative: <RelativeTime date={NOW - 26 * HOUR} now={NOW} /> ·{" "}
                  <RelativeTime date={NOW - 5 * 60 * 1000} now={NOW} />
                </div>
                <div className="text-ui-small">
                  Inline code like <Code>public.orders</Code> and{" "}
                  <Code>created_at</Code>.
                </div>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="Table"
        description="Semantic table primitives with sortable headers, hover and selected rows. For the large result grid the studio has its own engine; this is for settings and small sets."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead sort={sortFor("name")} onSort={() => toggleSort("name")}>
                Column
              </TableHead>
              <TableHead sort={sortFor("type")} onSort={() => toggleSort("type")}>
                Type
              </TableHead>
              <TableHead>Nullable</TableHead>
              <TableHead numeric>Sample</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c, i) => (
              <TableRow key={c.name} selected={i === 0}>
                <TableCell>
                  <Code>{c.name}</Code>
                </TableCell>
                <TableCell>
                  <Badge intent="neutral" size="sm">
                    {c.type}
                  </Badge>
                </TableCell>
                <TableCell>{c.nullable ? "yes" : "no"}</TableCell>
                <TableCell numeric>{c.rows}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CatalogSection>

      <CatalogSection
        title="Tree & Timeline"
        description="A disclosure tree for the schema explorer; a timeline for an activity feed."
      >
        <Grid columns={2} gap="md">
          <Card>
            <CardHeader>
              <CardTitle>Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <Tree>
                <TreeItem
                  label="public"
                  icon={<Database />}
                  defaultExpanded
                >
                  <TreeItem label="tables" icon={<FolderSimple />} defaultExpanded>
                    <TreeItem label="orders" icon={<TableIcon />} trailing="48k" />
                    <TreeItem label="users" icon={<TableIcon />} trailing="1.2k" />
                    <TreeItem label="events" icon={<TableIcon />} trailing="9.8M" />
                  </TreeItem>
                  <TreeItem label="views" icon={<FolderSimple />} />
                </TreeItem>
              </Tree>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline>
                <TimelineItem
                  marker={<StatusDot status="live" />}
                  time="2 hours ago"
                >
                  Ran <Code>select * from orders</Code> · 100 rows
                </TimelineItem>
                <TimelineItem time="yesterday">
                  Updated connection <b>Production replica</b>
                </TimelineItem>
                <TimelineItem
                  marker={<StatusDot status="error" />}
                  time="3 days ago"
                  last
                >
                  Connection failed — SSL required
                </TimelineItem>
              </Timeline>
            </CardContent>
          </Card>
        </Grid>
      </CatalogSection>

      <CatalogSection
        title="Code block"
        description="Multi-line code with an optional caption bar, copy control, and line numbers."
      >
        <Grid columns={2} gap="md">
          <CodeBlock
            caption="query.sql"
            code={`select o.id, o.total, u.email
from orders o
join users u on u.id = o.user_id
where o.total > 100
order by o.total desc
limit 50;`}
            showLineNumbers
          />
          <CodeBlock
            caption="shell"
            code="pmsql connect postgres://localhost:5432/app"
          />
        </Grid>
      </CatalogSection>
    </main>
  );
}
