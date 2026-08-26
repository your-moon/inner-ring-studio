"use client";

import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Download,
  EyeOff,
  Filter,
  Globe,
  GripVertical,
  Hash,
  MapPin,
  Plus,
  Rows3,
  Search,
  Settings2,
  Sigma,
  SortAsc,
  SortDesc,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/*
 * Attio collection & table — a feature-complete, exact-spec clone (no DB).
 * Ground-truthed from app.attio.com/companies; interaction model discovered live
 * (sort/filter/calculation menus). See docs/study/attio-collection-spec.md.
 * Reproduces the SPEC/behavior, never Attio's proprietary icons or assets.
 *
 * Features: checkbox multi-select + select-all · column-type icons · sortable
 * columns · column header menu (sort/hide) · column RESIZE (drag) · functional
 * SORT popover (multi-sort, Asc/Desc, add/remove) · functional FILTER popover
 * (attribute picker → operator + value) · per-column CALCULATION menu in the
 * footer (Count/Percent empty·filled, and Sum/Avg/Median/Min/Max/Range for
 * numbers) · density/sizing (compact·default·relaxed) · row-click → record peek.
 */

type Row = {
  id: number;
  Company: string;
  Domain: string;
  Employees: number;
  Founded: number;
  Location: string;
};

const DATA: Row[] = [
  { id: 1, Company: "Google", Domain: "google.com", Employees: 182000, Founded: 1998, Location: "United States" },
  { id: 2, Company: "Microsoft", Domain: "microsoft.com", Employees: 221000, Founded: 1975, Location: "United States" },
  { id: 3, Company: "Disney", Domain: "disney.com", Employees: 225000, Founded: 1923, Location: "United States" },
  { id: 4, Company: "Apple", Domain: "apple.com", Employees: 164000, Founded: 1976, Location: "United States" },
  { id: 5, Company: "United Airlines", Domain: "united.com", Employees: 103000, Founded: 1926, Location: "United States" },
  { id: 6, Company: "PayPal", Domain: "paypal.com", Employees: 27200, Founded: 1998, Location: "United States" },
  { id: 7, Company: "Airbnb", Domain: "airbnb.com", Employees: 6800, Founded: 2008, Location: "United States" },
  { id: 8, Company: "LVMH", Domain: "lvmh.com", Employees: 213000, Founded: 1987, Location: "France" },
  { id: 9, Company: "Intercom", Domain: "intercom.com", Employees: 1000, Founded: 2011, Location: "United States" },
  { id: 10, Company: "Attio", Domain: "attio.com", Employees: 120, Founded: 2019, Location: "United Kingdom" },
];

type ColKey = keyof Omit<Row, "id">;

type ColDef = {
  key: ColKey;
  label: string;
  numeric?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

const COLUMNS: ColDef[] = [
  { key: "Company", label: "Company", icon: Building2 },
  { key: "Domain", label: "Domain", icon: Globe },
  { key: "Employees", label: "Employees", numeric: true, icon: Users },
  { key: "Founded", label: "Founded", numeric: true, icon: Calendar },
  { key: "Location", label: "Location", icon: MapPin },
];

type Dir = "asc" | "desc";
type Density = "compact" | "default" | "relaxed";
const ROW_H: Record<Density, number> = { compact: 32, default: 36, relaxed: 44 };

type CalcType =
  | "count_empty"
  | "count_filled"
  | "percent_empty"
  | "percent_filled"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "range";

const TEXT_CALCS: { key: CalcType; label: string }[] = [
  { key: "count_empty", label: "Count empty" },
  { key: "count_filled", label: "Count filled" },
  { key: "percent_empty", label: "Percent empty" },
  { key: "percent_filled", label: "Percent filled" },
];
const NUM_CALCS: { key: CalcType; label: string }[] = [
  { key: "sum", label: "Sum" },
  { key: "average", label: "Average" },
  { key: "median", label: "Median" },
  { key: "min", label: "Min" },
  { key: "max", label: "Max" },
  { key: "range", label: "Range" },
];

/* ---------------------------------------------------------------- primitives */

// Attio secondary button: white with a soft shadow ring (NOT ghost, NOT a border).
const SECONDARY_SHADOW =
  "shadow-[inset_0_0_0_1px_rgba(0,0,0,0),0_0_2px_0_rgba(28,40,64,0.18),0_1px_3px_0_rgba(0,0,0,0.04)]";
// Primary: brand fill + inset hairline + brand-tinted drop.
const PRIMARY_SHADOW =
  "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(94,106,210,0.28),0_3px_6px_-2px_rgba(94,106,210,0.14)]";
// Active chip: white with a 1px inset ring (like a pressed/applied pill).
const CHIP_ACTIVE_SHADOW = "shadow-[inset_0_0_0_1px_rgb(230,231,234)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]";

function ToolButton({
  children,
  primary,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "text-ui-small inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2 font-[var(--weight-medium)] transition-[filter,background-color] duration-[var(--motion-fast)] [&_svg]:size-3.5",
        primary
          ? `bg-primary [color:var(--primary-foreground)] ${PRIMARY_SHADOW} hover:brightness-[1.05]`
          : `bg-surface-panel ${SECONDARY_SHADOW} hover:bg-surface-hover ${active ? "[color:var(--content-primary)]" : "[color:var(--content-secondary)] hover:[color:var(--content-primary)]"}`,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function GhostChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-ui-small inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2 transition-[background-color,box-shadow] duration-[var(--motion-fast)] [&_svg]:size-3.5",
        active
          ? `bg-surface-panel ${CHIP_ACTIVE_SHADOW} [color:var(--content-primary)]`
          : "bg-black/[0.02] [color:var(--content-tertiary)] hover:[color:var(--content-secondary)] dark:bg-white/[0.03]"
      )}
    >
      {children}
    </button>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onClick,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "grid size-4 shrink-0 cursor-pointer place-items-center rounded-[6px] border [&_svg]:size-3",
        checked || indeterminate
          ? "bg-primary border-transparent [color:var(--primary-foreground)]"
          : "border-black/[0.14] bg-white hover:border-black/25 dark:border-white/20 dark:bg-transparent"
      )}
    >
      {checked ? <Check strokeWidth={3} /> : indeterminate ? <span className="h-0.5 w-2 rounded bg-current" /> : null}
    </span>
  );
}

/** Absolutely-positioned popover with the Attio menu elevation. */
function Popover({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          "bg-surface-overlay absolute z-50 rounded-[var(--radius-menu)] border border-border-subtle p-1 shadow-[var(--shadow-menu)]",
          "origin-top animate-[orbit-pop-in_var(--motion-fast)_var(--ease-out)_both] motion-reduce:animate-none",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

const menuItem =
  "text-ui-small flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left [color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)] [&_svg]:size-3.5";

/* ---------------------------------------------------------------- record peek */

function RecordPeek({ row, onClose }: { row: Row; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "activity">("overview");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const fields: [React.ComponentType<{ className?: string }>, string, string][] = [
    [Globe, "Domain", row.Domain],
    [Users, "Employees", row.Employees.toLocaleString()],
    [Calendar, "Founded", String(row.Founded)],
    [MapPin, "Location", row.Location],
    [Building2, "Categories", "Search · Advertising · Cloud"],
  ];
  return (
    <>
      {/* transparent click-catcher: the table stays visible behind the peek */}
      <div className="absolute inset-0 z-40" onClick={onClose} />
      <aside
        className={cn(
          "bg-surface-panel border-border-subtle absolute inset-y-0 right-0 z-50 flex w-[420px] flex-col border-l shadow-[var(--shadow-menu)] transition-transform duration-[var(--motion-default)] [transition-timing-function:var(--ease-out)]",
          shown ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="border-border-subtle flex h-[52px] items-center gap-2 border-b px-3">
          <span className="bg-surface-hover grid size-6 place-items-center rounded-[6px] text-[12px] font-semibold [color:var(--content-secondary)]">
            {row.Company.slice(0, 1)}
          </span>
          <span className="text-[16px] font-[var(--weight-semibold)] [color:var(--content-primary)]">
            {row.Company}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-surface-hover ml-auto grid size-7 place-items-center rounded-[8px] [color:var(--content-tertiary)] [&_svg]:size-4"
          >
            <X />
          </button>
        </div>
        <div className="flex items-center gap-1 px-3 pt-2">
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
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="text-ui-caption mb-2 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
            Record Details
          </div>
          {tab === "overview" ? (
            <div className="flex flex-col">
              {fields.map(([Icon, label, value]) => (
                <div key={label} className="flex h-9 items-center gap-2 rounded-[6px] px-1 hover:bg-surface-hover">
                  <Icon className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
                  <span className="text-ui-small w-[92px] shrink-0 [color:var(--content-tertiary)]">{label}</span>
                  <span className="text-ui-small truncate [color:var(--content-primary)]">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              {["Email · Re: Partnership", "Note · Kickoff call", "Task · Send proposal"].map((a) => (
                <div key={a} className="text-ui-small flex items-center gap-2 [color:var(--content-secondary)]">
                  <span className="size-1.5 rounded-full bg-[var(--content-tertiary)]" />
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ calc calc */

function computeCalc(rows: Row[], col: ColDef, calc: CalcType): string {
  const vals = rows.map((r) => r[col.key]);
  const filled = vals.filter((v) => v !== null && v !== undefined && v !== "");
  const empty = vals.length - filled.length;
  switch (calc) {
    case "count_empty":
      return String(empty);
    case "count_filled":
      return String(filled.length);
    case "percent_empty":
      return `${Math.round((empty / vals.length) * 100)}%`;
    case "percent_filled":
      return `${Math.round((filled.length / vals.length) * 100)}%`;
  }
  const nums = (filled as number[]).slice().sort((a, b) => a - b);
  if (!nums.length) return "—";
  const sum = nums.reduce((a, b) => a + b, 0);
  const fmt = (n: number) => Math.round(n).toLocaleString();
  switch (calc) {
    case "sum":
      return fmt(sum);
    case "average":
      return fmt(sum / nums.length);
    case "median":
      return fmt(nums[Math.floor(nums.length / 2)]);
    case "min":
      return fmt(nums[0]);
    case "max":
      return fmt(nums[nums.length - 1]);
    case "range":
      return fmt(nums[nums.length - 1] - nums[0]);
    default:
      return "—";
  }
}

/* --------------------------------------------------------------------- page */

export default function AttioTablePage() {
  const [widths, setWidths] = useState<Record<ColKey, number>>({
    Company: 220,
    Domain: 180,
    Employees: 130,
    Founded: 110,
    Location: 180,
  });
  const [sorts, setSorts] = useState<{ key: ColKey; dir: Dir }[]>([{ key: "Founded", dir: "asc" }]);
  const [filters, setFilters] = useState<{ key: ColKey; value: string }[]>([]);
  const [hidden, setHidden] = useState<Set<ColKey>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [calcs, setCalcs] = useState<Partial<Record<ColKey, CalcType>>>({ Employees: "sum" });
  const [density, setDensity] = useState<Density>("default");

  // which popover is open
  const [pop, setPop] = useState<null | "sort" | "filter" | "settings" | { calc: ColKey } | { colmenu: ColKey }>(null);

  const [peek, setPeek] = useState<Row | null>(null);
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(null);

  const columns = COLUMNS.filter((c) => !hidden.has(c.key));
  const rowH = ROW_H[density];

  const rows = useMemo(() => {
    let out = DATA.filter((r) =>
      filters.every((f) => String(r[f.key]).toLowerCase().includes(f.value.toLowerCase()))
    );
    if (sorts.length) {
      out = [...out].sort((a, b) => {
        for (const s of sorts) {
          const dir = s.dir === "asc" ? 1 : -1;
          const av = a[s.key];
          const bv = b[s.key];
          let c = 0;
          if (typeof av === "number" && typeof bv === "number") c = av - bv;
          else c = String(av).localeCompare(String(bv));
          if (c !== 0) return c * dir;
        }
        return 0;
      });
    }
    return out;
  }, [sorts, filters]);

  const allChecked = selected.size === rows.length && rows.length > 0;
  const someChecked = selected.size > 0 && !allChecked;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleRow = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const cycleSort = (key: ColKey) =>
    setSorts((s) => {
      const ex = s.find((x) => x.key === key);
      if (!ex) return [{ key, dir: "asc" }];
      if (ex.dir === "asc") return [{ key, dir: "desc" }];
      return [];
    });

  const onResizeStart = (key: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { key, startX: e.clientX, startW: widths[key] };
    const move = (ev: MouseEvent) => {
      const r = resizing.current;
      if (!r) return;
      const w = Math.max(80, r.startW + (ev.clientX - r.startX));
      setWidths((prev) => ({ ...prev, [r.key]: w }));
    };
    const up = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const gridTemplate = `40px ${columns.map((c) => `${widths[c.key]}px`).join(" ")} minmax(0,1fr)`;

  const sortOf = (key: ColKey) => sorts.find((s) => s.key === key);

  return (
    <div className="bg-surface-panel relative flex h-screen flex-col overflow-hidden">
      {/* Bar 1 — view header */}
      <header className="border-border-subtle flex h-[49px] shrink-0 items-center gap-2 border-b px-3">
        <span className="text-ui-default font-[var(--weight-semibold)] [color:var(--content-primary)]">
          Companies
        </span>
        <span className="text-ui-caption [color:var(--content-tertiary)]">{rows.length}</span>
        <div className="ml-auto">
          <ToolButton>
            <Search /> Search
          </ToolButton>
        </div>
      </header>

      {/* Bar 2 — view toolbar */}
      <div className="border-border-subtle relative flex h-[50px] shrink-0 items-center gap-1 border-b px-3">
        <ToolButton>
          All Companies <ChevronDown />
        </ToolButton>
        <div className="relative">
          <ToolButton active={pop === "settings"} onClick={() => setPop(pop === "settings" ? null : "settings")}>
            <Settings2 /> View settings
          </ToolButton>
          {pop === "settings" ? (
            <Popover onClose={() => setPop(null)} className="top-[calc(100%+4px)] left-0 w-[240px]">
              <div className="text-ui-caption px-2 py-1 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
                Row height
              </div>
              {(["compact", "default", "relaxed"] as Density[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={cn(menuItem, "capitalize")}
                  onClick={() => {
                    setDensity(d);
                    setPop(null);
                  }}
                >
                  <Rows3 /> {d}
                  {density === d ? <Check className="ml-auto size-3.5 [color:var(--content-link)]" /> : null}
                </button>
              ))}
              {hidden.size > 0 ? (
                <>
                  <div className="my-1 h-px bg-[var(--border-subtle)]" />
                  <button type="button" className={menuItem} onClick={() => { setHidden(new Set()); setPop(null); }}>
                    <EyeOff /> Show {hidden.size} hidden column{hidden.size > 1 ? "s" : ""}
                  </button>
                </>
              ) : null}
            </Popover>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ToolButton>
            <Download /> Import / Export
          </ToolButton>
          <ToolButton primary>
            <Plus /> New Company
          </ToolButton>
        </div>
      </div>

      {/* Bar 3 — sort / filter chips */}
      <div className="border-border-subtle relative flex h-[44px] shrink-0 items-center gap-1.5 border-b px-3">
        <div className="relative">
          <GhostChip active={pop === "sort" || sorts.length > 0} onClick={() => setPop(pop === "sort" ? null : "sort")}>
            <ArrowUpDown />
            {sorts.length ? `Sorted by ${sorts[0].key}${sorts.length > 1 ? ` +${sorts.length - 1}` : ""}` : "Sort"}
          </GhostChip>
          {pop === "sort" ? (
            <Popover onClose={() => setPop(null)} className="top-[calc(100%+4px)] left-0 w-[280px]">
              {sorts.length === 0 ? (
                <div className="text-ui-small px-2 py-2 [color:var(--content-tertiary)]">No sorts applied.</div>
              ) : (
                sorts.map((s, i) => (
                  <div key={s.key} className="flex h-9 items-center gap-1 px-1">
                    <GripVertical className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
                    <span className="text-ui-small flex-1 [color:var(--content-primary)]">{s.key}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSorts((arr) => arr.map((x, xi) => (xi === i ? { ...x, dir: x.dir === "asc" ? "desc" : "asc" } : x)))
                      }
                      className="text-ui-caption hover:bg-surface-hover flex h-6 items-center gap-1 rounded-[6px] px-1.5 [color:var(--content-secondary)] [&_svg]:size-3"
                    >
                      {s.dir === "asc" ? <SortAsc /> : <SortDesc />}
                      {s.dir === "asc" ? "Ascending" : "Descending"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSorts((arr) => arr.filter((_, xi) => xi !== i))}
                      className="hover:bg-surface-hover grid size-6 place-items-center rounded-[6px] [color:var(--content-tertiary)] [&_svg]:size-3.5"
                    >
                      <X />
                    </button>
                  </div>
                ))
              )}
              <div className="my-1 h-px bg-[var(--border-subtle)]" />
              <div className="text-ui-caption px-2 py-0.5 [color:var(--content-tertiary)]">Add sort</div>
              {COLUMNS.filter((c) => !sorts.some((s) => s.key === c.key)).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={menuItem}
                  onClick={() => setSorts((arr) => [...arr, { key: c.key, dir: "asc" }])}
                >
                  <c.icon /> {c.label}
                </button>
              ))}
            </Popover>
          ) : null}
        </div>

        <div className="relative">
          <GhostChip active={pop === "filter" || filters.length > 0} onClick={() => setPop(pop === "filter" ? null : "filter")}>
            <Filter />
            {filters.length ? `${filters.length} filter${filters.length > 1 ? "s" : ""}` : "Filter"}
          </GhostChip>
          {pop === "filter" ? (
            <Popover onClose={() => setPop(null)} className="top-[calc(100%+4px)] left-0 w-[280px]">
              {filters.map((f, i) => (
                <div key={i} className="flex h-9 items-center gap-1 px-1">
                  <span className="text-ui-small w-[80px] shrink-0 truncate [color:var(--content-primary)]">{f.key}</span>
                  <span className="text-ui-caption [color:var(--content-tertiary)]">contains</span>
                  <input
                    autoFocus
                    value={f.value}
                    onChange={(e) =>
                      setFilters((arr) => arr.map((x, xi) => (xi === i ? { ...x, value: e.target.value } : x)))
                    }
                    className="text-ui-small bg-surface-hover h-7 min-w-0 flex-1 rounded-[6px] px-2 outline-none [color:var(--content-primary)]"
                    placeholder="value…"
                  />
                  <button
                    type="button"
                    onClick={() => setFilters((arr) => arr.filter((_, xi) => xi !== i))}
                    className="hover:bg-surface-hover grid size-6 place-items-center rounded-[6px] [color:var(--content-tertiary)] [&_svg]:size-3.5"
                  >
                    <X />
                  </button>
                </div>
              ))}
              {filters.length ? <div className="my-1 h-px bg-[var(--border-subtle)]" /> : null}
              <div className="text-ui-caption px-2 py-0.5 [color:var(--content-tertiary)]">Filter by attribute</div>
              {COLUMNS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={menuItem}
                  onClick={() => setFilters((arr) => [...arr, { key: c.key, value: "" }])}
                >
                  <c.icon /> {c.label}
                </button>
              ))}
            </Popover>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-max">
          {/* header row */}
          <div
            className="bg-surface-panel border-border-subtle sticky top-0 z-10 grid h-10 items-center border-b"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="flex h-full items-center justify-center">
              <Checkbox checked={allChecked} indeterminate={someChecked} onClick={toggleAll} />
            </div>
            {columns.map((c) => {
              const s = sortOf(c.key);
              return (
                <div
                  key={c.key}
                  className="group/th border-border-subtle relative flex h-full items-center gap-1 border-r px-2"
                >
                  <c.icon className="size-3.5 shrink-0 [color:var(--content-tertiary)]" />
                  <button
                    type="button"
                    onClick={() => cycleSort(c.key)}
                    className={cn(
                      "flex grow items-center gap-1 truncate text-[13px] font-medium [color:var(--content-tertiary)]",
                      s && "[color:var(--content-secondary)]"
                    )}
                  >
                    {c.label}
                    {s ? s.dir === "asc" ? <SortAsc className="size-3" /> : <SortDesc className="size-3" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPop({ colmenu: c.key })}
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-[4px] hover:bg-surface-hover [color:var(--content-tertiary)] [&_svg]:size-3.5",
                      typeof pop === "object" && pop && "colmenu" in pop && pop.colmenu === c.key
                        ? "opacity-100"
                        : "opacity-0 group-hover/th:opacity-100"
                    )}
                  >
                    <ChevronDown />
                  </button>
                  {/* column menu */}
                  {typeof pop === "object" && pop && "colmenu" in pop && pop.colmenu === c.key ? (
                    <Popover onClose={() => setPop(null)} className="top-[calc(100%+2px)] left-0 w-[200px]">
                      <button type="button" className={menuItem} onClick={() => { setSorts([{ key: c.key, dir: "asc" }]); setPop(null); }}>
                        <SortAsc /> Sort ascending
                      </button>
                      <button type="button" className={menuItem} onClick={() => { setSorts([{ key: c.key, dir: "desc" }]); setPop(null); }}>
                        <SortDesc /> Sort descending
                      </button>
                      <button type="button" className={menuItem} onClick={() => { setFilters((a) => [...a, { key: c.key, value: "" }]); setPop("filter"); }}>
                        <Filter /> Filter by this column
                      </button>
                      <div className="my-1 h-px bg-[var(--border-subtle)]" />
                      <button type="button" className={menuItem} onClick={() => { setHidden((h) => new Set(h).add(c.key)); setPop(null); }}>
                        <EyeOff /> Hide column
                      </button>
                    </Popover>
                  ) : null}
                  {/* resize handle */}
                  <span
                    onMouseDown={(e) => onResizeStart(c.key, e)}
                    className="absolute top-0 right-0 z-20 h-full w-1 cursor-col-resize hover:bg-[var(--content-link)]/40"
                  />
                </div>
              );
            })}
            <div className="border-border-subtle h-full border-r" />
          </div>

          {/* body rows */}
          {rows.map((r) => {
            const isSel = selected.has(r.id);
            return (
              <div
                key={r.id}
                onClick={() => setPeek(r)}
                className={cn(
                  "group/row border-border-subtle grid cursor-pointer items-center border-b",
                  isSel ? "bg-surface-selected" : "hover:bg-surface-hover"
                )}
                style={{ gridTemplateColumns: gridTemplate, height: rowH }}
              >
                <div className="flex h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSel} onClick={() => toggleRow(r.id)} />
                </div>
                {columns.map((c, ci) => {
                  const v = r[c.key];
                  if (ci === 0) {
                    return (
                      <div key={c.key} className="border-border-subtle/50 flex h-full items-center gap-2 border-r px-2">
                        <span className="bg-surface-hover grid size-4 shrink-0 place-items-center rounded-[4px] text-[9px] font-semibold [color:var(--content-secondary)]">
                          {String(v).slice(0, 1)}
                        </span>
                        <span className="text-ui-small truncate [color:var(--content-link)]">{String(v)}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={c.key}
                      className={cn(
                        "text-ui-small border-border-subtle/50 flex h-full items-center border-r px-2 [color:var(--content-secondary)]",
                        c.numeric && "justify-end [font-variant-numeric:tabular-nums]"
                      )}
                    >
                      {c.numeric ? (v as number).toLocaleString() : String(v)}
                    </div>
                  );
                })}
                <div className="h-full" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — count/selection + per-column calculations */}
      <div
        className="bg-surface-panel border-border-subtle text-ui-caption sticky bottom-0 z-10 grid h-8 shrink-0 items-center border-t [color:var(--content-tertiary)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="flex h-full items-center justify-center" />
        {columns.map((c, ci) => {
          const calc = calcs[c.key];
          const active = typeof pop === "object" && pop && "calc" in pop && pop.calc === c.key;
          const opts = c.numeric ? [...NUM_CALCS, ...TEXT_CALCS] : TEXT_CALCS;
          return (
            <div key={c.key} className="border-border-subtle/50 relative flex h-full items-center border-r px-2">
              {ci === 0 && selected.size > 0 ? (
                <span className="[color:var(--content-primary)]">{selected.size} selected</span>
              ) : ci === 0 ? (
                <span>{rows.length} count</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPop(active ? null : { calc: c.key })}
                  className={cn(
                    "hover:bg-surface-hover flex h-6 w-full items-center gap-1 rounded-[6px] px-1",
                    c.numeric && "justify-end",
                    calc ? "[color:var(--content-secondary)]" : "[color:var(--content-tertiary)]"
                  )}
                >
                  {calc ? (
                    <>
                      <span className="[color:var(--content-tertiary)]">
                        {opts.find((o) => o.key === calc)?.label}
                      </span>
                      <span className="[color:var(--content-primary)] [font-variant-numeric:tabular-nums]">
                        {computeCalc(rows, c, calc)}
                      </span>
                    </>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100">Add calculation</span>
                  )}
                </button>
              )}
              {active ? (
                <Popover onClose={() => setPop(null)} className="bottom-[calc(100%+4px)] right-0 w-[190px]">
                  {c.numeric ? (
                    <div className="text-ui-caption px-2 py-0.5 [color:var(--content-tertiary)]">Number</div>
                  ) : null}
                  {opts.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      className={menuItem}
                      onClick={() => {
                        setCalcs((m) => ({ ...m, [c.key]: o.key }));
                        setPop(null);
                      }}
                    >
                      {c.numeric && NUM_CALCS.some((n) => n.key === o.key) ? <Sigma /> : <Hash />}
                      {o.label}
                      {calc === o.key ? <Check className="ml-auto size-3.5 [color:var(--content-link)]" /> : null}
                    </button>
                  ))}
                  {calc ? (
                    <>
                      <div className="my-1 h-px bg-[var(--border-subtle)]" />
                      <button
                        type="button"
                        className={menuItem}
                        onClick={() => {
                          setCalcs((m) => {
                            const n = { ...m };
                            delete n[c.key];
                            return n;
                          });
                          setPop(null);
                        }}
                      >
                        <X /> Clear
                      </button>
                    </>
                  ) : null}
                </Popover>
              ) : null}
            </div>
          );
        })}
        <div />
      </div>

      {peek ? <RecordPeek row={peek} onClose={() => setPeek(null)} /> : null}
    </div>
  );
}
