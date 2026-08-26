import {
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------- Card */

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Raised sits on a shadow; flat is a hairline panel (the default). */
  elevation?: "flat" | "raised";
};

/** A bounded content surface. Flat by default; raised only when it floats. */
export function Card({ elevation = "flat", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)]",
        elevation === "raised"
          ? "bg-surface-raised shadow-[var(--shadow-raised)]"
          : "bg-surface-panel border-border-default border",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-border-subtle flex flex-col gap-1 border-b px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "text-ui-default [color:var(--content-primary)] font-[var(--weight-medium)]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-border-subtle flex items-center gap-2 border-t px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Stat */

export type StatProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  trend?: { direction: "up" | "down"; label: ReactNode };
  className?: string;
};

/** A single headline metric: quiet label, prominent value, optional trend. */
export function Stat({ label, value, hint, trend, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="text-ui-caption [color:var(--content-tertiary)]">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-heading-medium [color:var(--content-primary)] font-semibold [font-variant-numeric:tabular-nums] tracking-[var(--tracking-heading)]">
          {value}
        </div>
        {trend ? (
          <span
            className={cn(
              "text-ui-caption font-[var(--weight-medium)]",
              trend.direction === "up"
                ? "[color:var(--intent-success)]"
                : "[color:var(--intent-danger)]"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.label}
          </span>
        ) : null}
      </div>
      {hint ? (
        <div className="text-ui-caption [color:var(--content-tertiary)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------- DescriptionList */

const DLContext = createContext<{ inline: boolean }>({ inline: false });

export type DescriptionListProps = HTMLAttributes<HTMLDListElement> & {
  /** Inline puts term and detail on one row (row inspector); stacked is the default. */
  inline?: boolean;
};

/** Term/detail pairs — the row inspector's backbone. */
export function DescriptionList({
  inline = false,
  className,
  ...props
}: DescriptionListProps) {
  return (
    <DLContext.Provider value={{ inline }}>
      <dl
        className={cn("divide-border-subtle divide-y", className)}
        {...props}
      />
    </DLContext.Provider>
  );
}

export type DescriptionItemProps = {
  term: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DescriptionItem({
  term,
  children,
  className,
}: DescriptionItemProps) {
  const { inline } = useContext(DLContext);
  return (
    <div
      className={cn(
        "py-2",
        inline
          ? "grid grid-cols-[minmax(0,140px)_1fr] items-baseline gap-3"
          : "flex flex-col gap-0.5",
        className
      )}
    >
      <dt className="text-ui-small [color:var(--content-tertiary)]">{term}</dt>
      <dd className="text-ui-default [color:var(--content-primary)] min-w-0">
        {children}
      </dd>
    </div>
  );
}

/* --------------------------------------------------------------- KeyValue */

export type KeyValueProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

/** A compact inline "label: value" for dense chrome (toolbars, footers). */
export function KeyValue({ label, children, className }: KeyValueProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="text-ui-caption [color:var(--content-tertiary)]">
        {label}
      </span>
      <span className="text-ui-small [color:var(--content-secondary)] [font-variant-numeric:tabular-nums]">
        {children}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------- List */

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn("divide-border-subtle divide-y", className)}
      {...props}
    />
  );
}

export type ListItemProps = HTMLAttributes<HTMLLIElement> & {
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function ListItem({
  leading,
  trailing,
  children,
  className,
  ...props
}: ListItemProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-1 py-2 text-ui-default",
        className
      )}
      {...props}
    >
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing ? (
        <span className="[color:var(--content-tertiary)] shrink-0">
          {trailing}
        </span>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------- Code */

/** Inline monospace for identifiers, values, SQL fragments. */
export function Code({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        "bg-surface-hover [color:var(--content-secondary)] rounded-[var(--radius-small)] px-1 py-0.5 font-mono text-[0.9em]",
        className
      )}
      {...props}
    />
  );
}

/* ----------------------------------------------------------- TruncatedText */

export type TruncatedTextProps = HTMLAttributes<HTMLSpanElement> & {
  children: string;
};

/** Single-line truncation that keeps the full text as a native tooltip. */
export function TruncatedText({
  children,
  className,
  ...props
}: TruncatedTextProps) {
  return (
    <span
      title={children}
      className={cn("block truncate", className)}
      {...props}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------- Timestamp / RelativeTime */

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export type TimestampProps = {
  date: Date | string | number;
  /** Include the time alongside the date. */
  withTime?: boolean;
  className?: string;
};

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const DATETIME_FMT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** An absolute timestamp with the machine-readable value in <time datetime>. */
export function Timestamp({ date, withTime = false, className }: TimestampProps) {
  const d = toDate(date);
  const fmt = withTime ? DATETIME_FMT : DATE_FMT;
  return (
    <time
      dateTime={d.toISOString()}
      className={cn("[font-variant-numeric:tabular-nums]", className)}
    >
      {fmt.format(d)}
    </time>
  );
}

const RELATIVE_FMT = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

/** Relative time ("3 hours ago"); pass `now` for deterministic rendering/tests. */
export function RelativeTime({
  date,
  now = Date.now(),
  className,
}: {
  date: Date | string | number;
  now?: number;
  className?: string;
}) {
  const d = toDate(date);
  const diffSeconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  const [unit, secondsPer] =
    RELATIVE_STEPS.find(([, s]) => abs >= s) ?? RELATIVE_STEPS[5];
  const value = Math.round(diffSeconds / secondsPer);
  return (
    <time dateTime={d.toISOString()} className={className}>
      {RELATIVE_FMT.format(value, unit)}
    </time>
  );
}
