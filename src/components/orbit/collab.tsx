"use client";

import { DownloadSimple, FileText, Plus, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AvatarGroup, type AvatarGroupPerson } from "./avatar-group";
import IconButton from "./icon-button";

function Initial({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "bg-surface-selected [color:var(--content-secondary)] grid size-5 shrink-0 place-items-center rounded-full text-[9px] leading-none font-[var(--weight-semibold)]",
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/* --------------------------------------------------------------- MentionMenu */

export type Mentionable = { id: string; name: string };

/** The @-mention autocomplete: a people list anchored at the caret. */
export function MentionMenu({
  people,
  activeId,
  onSelect,
  className,
}: {
  people: Mentionable[];
  activeId?: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="listbox"
      className={cn(
        "border-border-default bg-surface-overlay w-56 overflow-hidden rounded-[var(--radius-menu)] border p-1 shadow-[var(--shadow-menu)]",
        className
      )}
    >
      {people.map((p) => (
        <button
          key={p.id}
          role="option"
          aria-selected={p.id === activeId}
          type="button"
          onClick={() => onSelect(p.id)}
          className={cn(
            "text-ui-default flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left",
            p.id === activeId ? "bg-surface-hover" : "hover:bg-surface-hover"
          )}
        >
          <Initial name={p.name} />
          <span className="min-w-0 flex-1 truncate [color:var(--content-primary)]">
            {p.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- EmojiPicker */

const COMMON_EMOJI = [
  "👍", "🎉", "❤️", "😄", "🚀", "👀", "🙏", "🔥",
  "✅", "❌", "💡", "⚡", "🐛", "🎯", "💯", "👏",
];

/** A compact emoji grid, e.g. for adding a reaction. */
export function EmojiPicker({
  emojis = COMMON_EMOJI,
  onSelect,
  className,
}: {
  emojis?: string[];
  onSelect: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border-default bg-surface-overlay grid w-56 grid-cols-8 gap-0.5 rounded-[var(--radius-menu)] border p-1.5 shadow-[var(--shadow-menu)]",
        className
      )}
    >
      {emojis.map((e) => (
        <button
          key={e}
          type="button"
          aria-label={`React ${e}`}
          onClick={() => onSelect(e)}
          className="focus-ring grid size-6 place-items-center rounded-[6px] text-[15px] leading-none hover:bg-surface-hover"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- AttachmentRow */

/** A file attachment row: type icon, name, size, download + remove. */
export function AttachmentRow({
  name,
  size,
  icon,
  onDownload,
  onRemove,
  className,
}: {
  name: ReactNode;
  size?: ReactNode;
  icon?: ReactNode;
  onDownload?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group border-border-default bg-surface-panel flex items-center gap-2.5 rounded-[var(--radius-control)] border px-2.5 py-2",
        className
      )}
    >
      <span className="[color:var(--content-tertiary)] shrink-0 [&_svg]:size-[var(--icon-md)]">
        {icon ?? <FileText />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ui-small [color:var(--content-primary)] block truncate">
          {name}
        </span>
        {size ? (
          <span className="text-ui-caption [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
            {size}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        {onDownload ? (
          <IconButton aria-label="Download" size="sm" onClick={onDownload}>
            <DownloadSimple />
          </IconButton>
        ) : null}
        {onRemove ? (
          <IconButton aria-label="Remove attachment" size="sm" onClick={onRemove}>
            <X />
          </IconButton>
        ) : null}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- ActivityFeedItem */

/** A system activity event ("Alex changed status to Done · 2h"). Quieter than
 * a comment — an icon/avatar rail, one line, no body box. */
export function ActivityFeedItem({
  actor,
  children,
  time,
  icon,
  last = false,
}: {
  actor?: string;
  children: ReactNode;
  time?: ReactNode;
  icon?: ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center">
        <span className="grid size-5 shrink-0 place-items-center">
          {icon ? (
            <span className="[color:var(--content-tertiary)] [&_svg]:size-3.5">{icon}</span>
          ) : actor ? (
            <Initial name={actor} />
          ) : (
            <span className="bg-border-strong size-2 rounded-full" />
          )}
        </span>
        {!last ? <span className="bg-border-subtle w-px flex-1" /> : null}
      </div>
      <div className={cn("text-ui-small [color:var(--content-secondary)] flex-1", last ? "pb-0" : "pb-3")}>
        {actor ? (
          <span className="[color:var(--content-primary)] font-[var(--weight-medium)]">
            {actor}{" "}
          </span>
        ) : null}
        {children}
        {time ? (
          <span className="[color:var(--content-tertiary)]"> · {time}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- SubscriberList */

/** Subscribers to an issue: overlapping avatars + an add control. */
export function SubscriberList({
  people,
  onAdd,
  className,
}: {
  people: AvatarGroupPerson[];
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AvatarGroup people={people} size="sm" max={5} />
      {onAdd ? (
        <button
          type="button"
          aria-label="Add subscriber"
          onClick={onAdd}
          className="focus-ring border-border-strong [color:var(--content-tertiary)] grid size-5 place-items-center rounded-full border border-dashed hover:[color:var(--content-primary)] [&_svg]:size-3"
        >
          <Plus weight="bold" />
        </button>
      ) : null}
    </div>
  );
}
