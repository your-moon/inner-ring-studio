import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A vertical activity feed: a connecting rail with a marker per event. */
export function Timeline({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <ol className={cn("flex flex-col", className)}>{children}</ol>;
}

export type TimelineItemProps = {
  children: ReactNode;
  marker?: ReactNode;
  time?: ReactNode;
  last?: boolean;
};

export function TimelineItem({
  children,
  marker,
  time,
  last = false,
}: TimelineItemProps) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-1 grid size-3 shrink-0 place-items-center">
          {marker ?? (
            <span className="border-border-strong bg-surface-canvas size-2 rounded-full border" />
          )}
        </span>
        {!last ? <span className="bg-border-subtle w-px flex-1" /> : null}
      </div>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
        {time ? (
          <div className="text-ui-caption [color:var(--content-tertiary)]">
            {time}
          </div>
        ) : null}
        <div className="text-ui-default [color:var(--content-secondary)]">
          {children}
        </div>
      </div>
    </li>
  );
}
