"use client";

import {
  AvatarGroup,
  Button,
  CommandFooter,
  CommandGroup,
  CommandMenu,
  CommandRow,
  DueDateBadge,
  FilterChip,
  IconButton,
  IssueRow,
  Kbd,
  Label,
  PeekModal,
  PeekModalContent,
  PresenceAvatar,
  PriorityIcon,
  PropertyRow,
  SidebarNavItem,
  SidebarSection,
  StatusIcon,
  SubIssueList,
  ViewTabs,
  type LabelColor,
  type Priority,
  type WorkflowStatus,
} from "@/components/orbit";
import { ArrowRight, Bell, Box, ChevronDown, CircleUser, Copy, Ellipsis, GitBranch, Inbox, Layers, LayoutGrid, Pencil, Plus, Rocket, Search, SlidersHorizontal, Tag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  title: string;
  priority: Priority;
  label?: { text: string; color: LabelColor };
  date: string;
  who: string;
  project: string;
  sub?: [number, number];
  desc: string;
};

const GROUPS: { status: WorkflowStatus; title: string; rows: Row[] }[] = [
  {
    status: "started",
    title: "In Progress",
    rows: [
      { id: "MOO-42", title: "Pool exhausts under burst load", priority: "urgent", label: { text: "bug", color: "red" }, date: "Aug 26", who: "Alex", project: "Postgres proxy", sub: [2, 5], desc: "Under a burst of concurrent connections the pool hits its ceiling and new checkouts block past the timeout. Repro with 200 parallel clients; expected graceful queueing." },
      { id: "MOO-39", title: "Add connection-pool metrics", priority: "high", date: "Aug 25", who: "Bru", project: "Postgres proxy", desc: "Expose in-use / idle / waiting counts and checkout latency so we can see saturation before it bites." },
    ],
  },
  {
    status: "todo",
    title: "Todo",
    rows: [
      { id: "MOO-37", title: "Prod write-confirm gate", priority: "medium", label: { text: "backend", color: "blue" }, date: "Aug 24", who: "Alex", project: "Postgres proxy", sub: [0, 3], desc: "Any write statement against a prod-tagged connection should prompt a confirm step naming the target." },
      { id: "MOO-33", title: "Vault key rotation", priority: "medium", date: "Aug 23", who: "Cy", project: "Encrypted vault", desc: "Rotate the vault master key without downtime; re-wrap data keys lazily." },
      { id: "MOO-31", title: "Docs: connection pooling", priority: "low", label: { text: "docs", color: "purple" }, date: "Aug 22", who: "Bru", project: "Postgres proxy", desc: "Document the pooling model, sizing guidance, and the prod-confirm behaviour." },
    ],
  },
  {
    status: "backlog",
    title: "Backlog",
    rows: [
      { id: "MOO-22", title: "Investigate slow COUNT(*) on large tables", priority: "low", date: "Aug 18", who: "Cy", project: "Postgres proxy", desc: "COUNT(*) on 100M+ row tables is slow; evaluate approximate counts / cached estimates." },
      { id: "MOO-18", title: "ClickHouse driver spike", priority: "none", label: { text: "spike", color: "amber" }, date: "Aug 15", who: "Alex", project: "Encrypted vault", desc: "Timeboxed spike on a ClickHouse driver: protocol, auth, and streaming reads." },
    ],
  },
];

const FLAT = GROUPS.flatMap((g) => g.rows.map((r) => ({ ...r, status: g.status })));

function GroupHeader({ status, title, count }: { status: WorkflowStatus; title: string; count: number }) {
  return (
    <div className="group/gh bg-surface-panel sticky top-0 z-10 flex h-8 items-center gap-2 px-5">
      <StatusIcon status={status} />
      <span className="text-ui-small font-[var(--weight-medium)] [color:var(--content-primary)]">{title}</span>
      <span className="text-ui-small [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">{count}</span>
      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/gh:opacity-100">
        <IconButton aria-label={`Add issue to ${title}`} size="sm"><Plus /></IconButton>
        <IconButton aria-label="Group options" size="sm"><Ellipsis /></IconButton>
      </div>
    </div>
  );
}

function NavHeader() {
  return (
    <button type="button" className="focus-ring hover:bg-surface-hover -mx-1 mb-1 flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5">
      <span className="bg-primary grid size-5 shrink-0 place-items-center rounded-[var(--radius-small)] text-[11px] font-semibold [color:var(--primary-foreground)]">M</span>
      <span className="text-ui-small font-[var(--weight-medium)] [color:var(--content-primary)]">Moon</span>
      <ChevronDown className="size-3 [color:var(--content-tertiary)]" />
      <span className="ml-auto flex items-center gap-0.5">
        <IconButton aria-label="Search" size="sm"><Search /></IconButton>
        <IconButton aria-label="New issue" size="sm"><Plus /></IconButton>
      </span>
    </button>
  );
}

function Hint({ keys, children }: { keys: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5 [color:var(--content-tertiary)]">
      <Kbd>{keys}</Kbd>
      {children}
    </span>
  );
}

export default function DashboardExample() {
  const [nav, setNav] = useState("mine");
  const [tab, setTab] = useState("assigned");
  const [sel, setSel] = useState(0);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [cmdk, setCmdk] = useState(false);

  const active = useMemo(() => FLAT.find((r) => r.id === peekId) ?? null, [peekId]);

  const move = useCallback(
    (dir: 1 | -1) => {
      setSel((s) => {
        const n = Math.max(0, Math.min(FLAT.length - 1, s + dir));
        setPeekId((p) => (p ? FLAT[n].id : p)); // if peek is open, walk records
        return n;
      });
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk((v) => !v);
        return;
      }
      if (cmdk) {
        if (e.key === "Escape") setCmdk(false);
        return;
      }
      if (typing) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); setPeekId(FLAT[sel].id); }
      else if (e.key === "Escape") { setPeekId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmdk, sel, move]);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-2 pt-8 pb-24 sm:px-6">
      <header className="mb-6">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">Example · interactive</div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">Linear-style workspace</h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          A working My&nbsp;Issues screen from Orbit. Click into the panel, then
          use <Kbd>↑</Kbd><Kbd>↓</Kbd> (or <Kbd>j</Kbd>/<Kbd>k</Kbd>) to move,
          <Kbd>↵</Kbd> to open the peek, <Kbd>⌘K</Kbd> for the command menu, and
          <Kbd>esc</Kbd> to close.
        </p>
      </header>

      <div className="border-border-default bg-sidebar relative flex h-[720px] overflow-hidden rounded-[var(--radius-modal)] border shadow-[var(--shadow-raised)]">
        {/* Sidebar */}
        <aside className="hidden w-[244px] shrink-0 flex-col p-2 md:flex">
          <NavHeader />
          <div className="flex flex-col gap-px">
            <SidebarNavItem icon={<Inbox />} label="Inbox" count={3} active={nav === "inbox"} onClick={() => setNav("inbox")} />
            <SidebarNavItem icon={<LayoutGrid />} label="My issues" active={nav === "mine"} onClick={() => setNav("mine")} />
          </div>
          <SidebarSection title="Workspace" className="mt-4">
            <SidebarNavItem icon={<Rocket />} label="Issues" active={nav === "issues"} onClick={() => setNav("issues")} />
            <SidebarNavItem icon={<Layers />} label="Projects" active={nav === "projects"} onClick={() => setNav("projects")} />
          </SidebarSection>
          <SidebarSection title="Favorites" className="mt-4">
            <SidebarNavItem icon={<Box />} label="Postgres proxy" onClick={() => {}} />
            <SidebarNavItem icon={<Box />} label="Encrypted vault" onClick={() => {}} />
          </SidebarSection>
        </aside>

        {/* Main inset panel */}
        <div className="min-w-0 flex-1 py-2 pr-2">
          <div className="border-border-default bg-surface-panel flex h-full flex-col overflow-hidden rounded-[var(--radius-menu)] border">
            {/* View header */}
            <div className="flex h-14 shrink-0 items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-4 [color:var(--content-tertiary)]" />
                <h2 className="text-heading-small font-semibold tracking-[var(--tracking-heading)] [color:var(--content-primary)]">My Issues</h2>
                <span className="text-ui-small [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">{FLAT.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <IconButton aria-label="Filter"><SlidersHorizontal /></IconButton>
                <Button variant="secondary" size="sm" title="Display" displayContent="items-last"><ChevronDown className="size-3" /></Button>
                <IconButton aria-label="View options"><Ellipsis /></IconButton>
              </div>
            </div>

            {/* Tabs + filter bar */}
            <div className="shrink-0 px-5">
              <ViewTabs value={tab} onChange={setTab} tabs={[{ value: "assigned", label: "Assigned", count: 7 }, { value: "created", label: "Created", count: 12 }, { value: "subscribed", label: "Subscribed", count: 3 }]} />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 px-5 py-2.5">
              <FilterChip field="Assignee" value="Me" onRemove={() => {}} />
              <FilterChip field="Priority" operator="≥" value="High" onRemove={() => {}} />
              <button type="button" className="focus-ring text-ui-small hover:bg-surface-hover flex h-7 items-center gap-1 rounded-[var(--radius-full)] px-2 [color:var(--content-tertiary)]">
                <Plus className="size-3.5" /> Filter
              </button>
            </div>

            {/* Grouped list */}
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {(() => { let idx = -1; return GROUPS.map((g) => (
                <section key={g.title}>
                  <GroupHeader status={g.status} title={g.title} count={g.rows.length} />
                  {g.rows.map((r) => { idx += 1; const i = idx; return (
                    <IssueRow
                      key={r.id}
                      id={r.id}
                      title={r.title}
                      priority={r.priority}
                      status={g.status}
                      selected={i === sel}
                      onClick={() => { setSel(i); setPeekId(r.id); }}
                      className="cursor-pointer px-5"
                      trailing={
                        <>
                          {r.sub ? (
                            <span className="text-ui-caption hidden items-center gap-1 [color:var(--content-tertiary)] sm:flex">
                              <GitBranch className="size-3" />{r.sub[0]}/{r.sub[1]}
                            </span>
                          ) : null}
                          {r.label ? <Label color={r.label.color}>{r.label.text}</Label> : null}
                          <span className="text-ui-caption hidden w-12 text-right [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums] sm:block">{r.date}</span>
                          <PresenceAvatar name={r.who} size="sm" />
                        </>
                      }
                    />
                  ); })}
                </section>
              )); })()}
            </div>

            {/* Keyboard hint bar */}
            <div className="border-border-subtle text-ui-caption flex h-9 shrink-0 items-center gap-4 border-t px-5">
              <Hint keys="↑↓">Navigate</Hint>
              <Hint keys="↵">Open</Hint>
              <Hint keys="⌘K">Command</Hint>
              <span className="ml-auto flex items-center gap-1.5 [color:var(--content-tertiary)]">
                <Kbd>C</Kbd> New issue
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Peek panel */}
      <PeekModal open={!!active} onOpenChange={(o) => !o && setPeekId(null)}>
        {active ? (
          <PeekModalContent
            title={`${active.id}  ${active.title}`}
            onExpand={() => {}}
            aside={
              <div className="flex flex-col gap-1">
                <PropertyRow label="Status"><span className="inline-flex items-center gap-1.5 text-ui-small"><StatusIcon status={active.status} /> {groupTitle(active.status)}</span></PropertyRow>
                <PropertyRow label="Priority"><span className="inline-flex items-center gap-1.5 text-ui-small"><PriorityIcon priority={active.priority} /> {cap(active.priority)}</span></PropertyRow>
                <PropertyRow label="Assignee"><span className="inline-flex items-center gap-1.5 text-ui-small"><PresenceAvatar name={active.who} size="sm" presence="online" /> {active.who}</span></PropertyRow>
                <PropertyRow label="Project"><span className="inline-flex items-center gap-1.5 text-ui-small"><Layers className="size-3.5 [color:var(--content-tertiary)]" /> {active.project}</span></PropertyRow>
                <PropertyRow label="Labels">{active.label ? <Label color={active.label.color}>{active.label.text}</Label> : <span className="text-ui-small [color:var(--content-tertiary)]">—</span>}</PropertyRow>
                <PropertyRow label="Due date"><DueDateBadge date="Sep 5" /></PropertyRow>
                <PropertyRow label="Subscribers"><AvatarGroup size="sm" people={[{ name: active.who }, { name: "Bru" }, { name: "Cy" }]} /></PropertyRow>
              </div>
            }
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              <div>
                <span className="text-ui-small font-mono [color:var(--content-tertiary)]">{active.id}</span>
                <h1 className="text-heading-medium mt-1 font-semibold tracking-[var(--tracking-heading)] [color:var(--content-primary)]">{active.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" title="Edit"><Pencil /></Button>
                <Button variant="secondary" size="sm" title="Assign"><CircleUser /></Button>
                <Button variant="secondary" size="sm" title="Label"><Tag /></Button>
                <Button variant="ghost" size="sm" title="Copy link"><Copy /></Button>
              </div>
              <p className="text-body [color:var(--content-secondary)]">{active.desc}</p>
              {active.sub ? (
                <SubIssueList done={active.sub[0]} total={active.sub[1]}>
                  <div className="text-ui-small flex h-8 items-center gap-2 px-1 [color:var(--content-secondary)]"><StatusIcon status="done" /> First child task</div>
                  <div className="text-ui-small flex h-8 items-center gap-2 px-1 [color:var(--content-secondary)]"><StatusIcon status="started" /> Second child task</div>
                </SubIssueList>
              ) : null}
              <div className="border-border-subtle flex items-center gap-2 border-t pt-4 text-ui-caption [color:var(--content-tertiary)]">
                <PresenceAvatar name={active.who} size="sm" /> {active.who} opened this · {active.date}
              </div>
            </div>
          </PeekModalContent>
        ) : null}
      </PeekModal>

      {/* Command palette (⌘K) */}
      {cmdk ? (
        <div className="fixed inset-0 z-[60] flex justify-center bg-black/40 pt-[12vh] backdrop-blur-[1px]" onClick={() => setCmdk(false)}>
          <div onClick={(e) => e.stopPropagation()} className="animate-[orbit-pop-in_var(--motion-base)_var(--ease-out)_both] h-fit">
            <CommandMenu footer={<CommandFooter />}>
              <CommandGroup heading="Issue">
                <CommandRow icon={<Plus />} label="Create new issue" shortcut={<Kbd>C</Kbd>} />
                <CommandRow icon={<Pencil />} label="Edit selected issue" shortcut={<Kbd>E</Kbd>} />
                <CommandRow icon={<GitBranch />} label="Copy branch name" />
              </CommandGroup>
              <CommandGroup heading="Navigation">
                <CommandRow icon={<ArrowRight />} label="Go to project…" hint="Postgres proxy" />
                <CommandRow icon={<Inbox />} label="Open inbox" hint="3 unread" />
                <CommandRow icon={<Bell />} label="Notification settings" />
              </CommandGroup>
            </CommandMenu>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function groupTitle(s: WorkflowStatus) {
  return { backlog: "Backlog", todo: "Todo", started: "In Progress", done: "Done", cancelled: "Cancelled" }[s];
}
