"use client";

import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Download,
  Filter,
  ArrowUpDown,
  Plus,
  Settings2,
  Search,
  Building2,
  Globe,
  Users,
  Calendar,
  MapPin,
  Check,
} from "lucide-react";
import { useState } from "react";

/*
 * Attio patterns — exact-spec clones (controls, chips, menus, record detail).
 * Ground-truthed from app.attio.com; numbers per docs/study/attio-collection-spec.md.
 * Reproduces the SPEC (measurements/colors/behavior), never Attio's assets.
 */

/* ---------------------------------------------------------------- primitives */

/** 28px / 8px toolbar control. */
function ToolButton({
  children,
  primary,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "text-ui-small inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2 font-[var(--weight-medium)] [&_svg]:size-3.5",
        primary
          ? "bg-primary [color:var(--primary-foreground)] hover:brightness-105"
          : "hover:bg-surface-hover [color:var(--content-secondary)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Ghost sort/filter chip. */
function GhostChip({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="text-ui-small inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-black/[0.02] px-2 [color:var(--content-tertiary)] hover:[color:var(--content-secondary)] dark:bg-white/[0.03] [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

/** 16px / 6px checkbox with the Attio hairline border. */
function AttioCheckbox({ checked }: { checked?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-4 place-items-center rounded-[6px] border [&_svg]:size-3",
        checked
          ? "bg-primary border-transparent [color:var(--primary-foreground)]"
          : "border-black/[0.12] bg-white dark:border-white/20 dark:bg-transparent"
      )}
    >
      {checked ? <Check strokeWidth={3} /> : null}
    </span>
  );
}

function Section({
  title,
  spec,
  children,
}: {
  title: string;
  spec?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-ui-default font-[var(--weight-semibold)] [color:var(--content-primary)]">
          {title}
        </h2>
        {spec ? (
          <span className="text-ui-caption [color:var(--content-tertiary)]">
            {spec}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------- menus */

/** The Attio menu/popover — 12px radius, --shadow-menu elevation, 6px items. */
function AttioMenu() {
  const items = [
    "Sort ascending",
    "Sort descending",
    "Filter by this column",
    "Hide column",
    "Edit column",
  ];
  return (
    <div className="bg-surface-overlay w-[240px] rounded-[var(--radius-menu)] border border-border-subtle p-1 shadow-[var(--shadow-menu)]">
      {items.map((it, i) => (
        <button
          key={it}
          type="button"
          className={cn(
            "text-ui-small flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left [color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
            i === 2 && "bg-surface-hover [color:var(--content-primary)]"
          )}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- record page */

function RecordDetail() {
  const [tab, setTab] = useState<"overview" | "activity">("overview");
  const fields: [React.ComponentType<{ className?: string }>, string, string][] =
    [
      [Globe, "Domains", "google.com"],
      [Users, "Employees", "182,000"],
      [Calendar, "Founded", "1998"],
      [MapPin, "Location", "United States"],
      [Building2, "Categories", "Search · Advertising · Cloud"],
    ];
  return (
    <div className="bg-surface-panel overflow-hidden rounded-[var(--radius-panel)] border border-border-subtle">
      {/* header + tab strip */}
      <div className="border-border-subtle flex h-[52px] items-center gap-2 border-b px-3">
        <span className="bg-surface-hover grid size-6 place-items-center rounded-[6px] text-[12px] font-semibold [color:var(--content-secondary)]">
          G
        </span>
        <span className="text-[16px] font-[var(--weight-semibold)] [color:var(--content-primary)]">
          Google
        </span>
        <div className="ml-4 flex items-center gap-1">
          {(["overview", "activity"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "text-ui-small h-7 rounded-[8px] px-2 capitalize font-[var(--weight-medium)]",
                tab === t
                  ? "bg-surface-hover [color:var(--content-primary)]"
                  : "[color:var(--content-tertiary)] hover:[color:var(--content-secondary)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex">
        {/* left detail rail — 320px */}
        <div className="w-[320px] shrink-0 border-r border-border-subtle p-3">
          <div className="text-ui-caption mb-2 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
            Record Details
          </div>
          <div className="flex flex-col">
            {fields.map(([Icon, label, value]) => (
              <div
                key={label}
                className="flex h-9 items-center gap-2 rounded-[6px] px-1 hover:bg-surface-hover"
              >
                <Icon className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
                <span className="text-ui-small w-[92px] shrink-0 [color:var(--content-tertiary)]">
                  {label}
                </span>
                <span className="text-ui-small truncate [color:var(--content-primary)]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* right column — feed */}
        <div className="min-h-[240px] flex-1 p-4">
          {tab === "overview" ? (
            <div className="text-ui-small [color:var(--content-secondary)]">
              Google specializes in organizing the world&apos;s information —
              search, advertising, and cloud. Overview tab shows summary cards;
              Activity shows the timeline of emails, notes and tasks.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {["Email · Re: Partnership", "Note · Kickoff call", "Task · Send proposal"].map(
                (a) => (
                  <div
                    key={a}
                    className="text-ui-small flex items-center gap-2 [color:var(--content-secondary)]"
                  >
                    <span className="size-1.5 rounded-full bg-[var(--content-tertiary)]" />
                    {a}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- page */

export default function AttioPatternsPage() {
  return (
    <div className="bg-surface-canvas h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[900px] flex-col gap-10 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-[22px] font-[var(--weight-semibold)] [color:var(--content-primary)]">
            Attio patterns
          </h1>
          <p className="text-ui-small [color:var(--content-secondary)]">
            Exact-spec clones — controls, chips, menus, and the record page. The
            full collection table lives under “Attio collection &amp; table”.
          </p>
        </header>

        <Section title="Controls" spec="28px tall · 8px radius · Inter">
          <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-panel)] border border-border-subtle bg-surface-panel p-3">
            <ToolButton>
              All Companies <ChevronDown />
            </ToolButton>
            <ToolButton>
              <Settings2 /> View settings
            </ToolButton>
            <ToolButton>
              <Download /> Import / Export
            </ToolButton>
            <ToolButton>
              <Search /> Search
            </ToolButton>
            <ToolButton primary>
              <Plus /> New Company
            </ToolButton>
          </div>
        </Section>

        <Section
          title="Sort / filter chips"
          spec="ghost — rgba(0,0,0,.02), solidify when active"
        >
          <div className="flex items-center gap-1.5 rounded-[var(--radius-panel)] border border-border-subtle bg-surface-panel p-3">
            <GhostChip>
              <ArrowUpDown /> Sorted by Founded
            </GhostChip>
            <GhostChip>
              <Filter /> Filter
            </GhostChip>
          </div>
        </Section>

        <Section
          title="Menu / popover"
          spec="12px radius · ring + soft drop · 6px items · 14px"
        >
          <AttioMenu />
        </Section>

        <Section title="Checkbox" spec="16px · 6px radius · hairline border">
          <div className="flex items-center gap-4 rounded-[var(--radius-panel)] border border-border-subtle bg-surface-panel p-3">
            <AttioCheckbox />
            <AttioCheckbox checked />
          </div>
        </Section>

        <Section title="Record page" spec="row → record · 320px detail rail · Overview/Activity tabs">
          <RecordDetail />
        </Section>
      </div>
    </div>
  );
}
