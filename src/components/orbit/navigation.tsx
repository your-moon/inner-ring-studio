"use client";

import { CaretRight, DotsThree } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";

/* ------------------------------------------------------------------- Tabs */

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
};
const TabsContext = createContext<TabsContextValue | null>(null);
const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used within <Tabs>");
  return ctx;
};

export type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;
  const setValue = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "border-border-subtle flex items-center gap-4 border-b",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function Tab({ value, className, children, ...props }: TabProps) {
  const { value: current, setValue, baseId } = useTabs();
  const selected = current === value;
  return (
    <button
      role="tab"
      type="button"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? "active" : "inactive"}
      onClick={() => setValue(value)}
      className={cn(
        "focus-ring press text-ui-default relative -mb-px h-9 border-b-2 border-transparent font-[var(--weight-medium)] whitespace-nowrap",
        selected
          ? "border-primary [color:var(--content-primary)]"
          : "[color:var(--content-tertiary)] hover:[color:var(--content-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabPanel({
  value,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value: current, baseId } = useTabs();
  if (current !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("focus-ring pt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------- SegmentedControl */

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  size?: "sm" | "base";
  className?: string;
};

/** A compact single-select switch (view/density/mode). One choice always on. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "base",
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      className={cn(
        "border-border-default bg-surface-canvas inline-flex items-center gap-0.5 rounded-[var(--radius-control)] border p-0.5",
        size === "sm" ? "h-7" : "h-8",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "focus-ring press text-ui-small inline-flex h-full items-center gap-1.5 rounded-[6px] px-2.5 font-[var(--weight-medium)]",
              selected
                ? "bg-surface-raised [color:var(--content-primary)] shadow-[var(--shadow-hairline),var(--shadow-raised)]"
                : "[color:var(--content-tertiary)] hover:[color:var(--content-primary)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- Breadcrumb */

export function Breadcrumb({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <nav aria-label="Breadcrumb" {...props}>
      <ol className={cn("flex items-center gap-1.5", className)}>{children}</ol>
    </nav>
  );
}

export type BreadcrumbItemProps = {
  href?: string;
  current?: boolean;
  children: ReactNode;
};

export function BreadcrumbItem({ href, current, children }: BreadcrumbItemProps) {
  return (
    <li className="flex items-center gap-1.5">
      {href && !current ? (
        <a
          href={href}
          className="focus-ring text-ui-small [color:var(--content-tertiary)] rounded-[4px] hover:[color:var(--content-primary)]"
        >
          {children}
        </a>
      ) : (
        <span
          aria-current={current ? "page" : undefined}
          className={cn(
            "text-ui-small",
            current
              ? "[color:var(--content-primary)] font-[var(--weight-medium)]"
              : "[color:var(--content-tertiary)]"
          )}
        >
          {children}
        </span>
      )}
      {!current ? (
        <CaretRight
          weight="bold"
          aria-hidden
          className="size-3 [color:var(--content-disabled)]"
        />
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------- Pagination */

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageRange(page: number, count: number): (number | "…")[] {
  if (count <= 7)
    return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push("…");
  out.push(count);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: PaginationProps) {
  const go = (p: number) => onPageChange(Math.min(pageCount, Math.max(1, p)));
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <IconButton
        aria-label="Previous page"
        size="sm"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        <CaretRight weight="bold" className="rotate-180" />
      </IconButton>
      {pageRange(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span
            key={`gap-${i}`}
            className="[color:var(--content-disabled)] grid size-7 place-items-center"
          >
            <DotsThree weight="bold" />
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => go(p)}
            className={cn(
              "focus-ring press text-ui-small grid size-7 place-items-center rounded-[var(--radius-control)] font-[var(--weight-medium)] [font-variant-numeric:tabular-nums]",
              p === page
                ? "bg-surface-selected [color:var(--content-primary)]"
                : "[color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]"
            )}
          >
            {p}
          </button>
        )
      )}
      <IconButton
        aria-label="Next page"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => go(page + 1)}
      >
        <CaretRight weight="bold" />
      </IconButton>
    </nav>
  );
}

/* ------------------------------------------------------------- PageHeader */

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** The standard page top: optional breadcrumb, title + description, actions. */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {breadcrumb}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-heading-medium [color:var(--content-primary)] font-semibold tracking-[var(--tracking-heading)]">
            {title}
          </h1>
          {description ? (
            <p className="text-ui-small [color:var(--content-tertiary)] mt-1">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
