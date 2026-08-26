"use client";

import { X } from "@phosphor-icons/react";
import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * People primitives shared by members, mentions, assignees and comments.
 * Ground-truthed on linear.app settings/members (avatar + presence + name).
 */

/* ------------------------------------------------------------------ Presence */

export type Presence = "online" | "away" | "dnd" | "offline";

const PRESENCE_META: Record<Presence, { label: string; color: string }> = {
  online: { label: "Online", color: "var(--intent-success)" },
  away: { label: "Away", color: "var(--intent-warning)" },
  dnd: { label: "Do not disturb", color: "var(--intent-danger)" },
  offline: { label: "Offline", color: "var(--border-strong)" },
};

/** A people-presence dot — colour is the meaning, the label is the words. */
export function PresenceDot({
  presence,
  className,
}: {
  presence: Presence;
  className?: string;
}) {
  const { label, color } = PRESENCE_META[presence];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

/* ------------------------------------------------------------- PresenceAvatar */

const AVATAR_SIZE = {
  sm: "size-5 text-[9px]",
  base: "size-6 text-[10px]",
  lg: "size-8 text-[13px]",
} as const;

const DOT_INSET = {
  sm: "size-2",
  base: "size-2.5",
  lg: "size-3",
} as const;

export type PresenceAvatarProps = {
  name: string;
  image?: string;
  size?: keyof typeof AVATAR_SIZE;
  presence?: Presence;
  className?: string;
};

/** An avatar (image or initial) with an optional presence dot ringed to the surface. */
export function PresenceAvatar({
  name,
  image,
  size = "base",
  presence,
  className,
}: PresenceAvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "bg-surface-hover grid place-items-center overflow-hidden rounded-full font-[var(--weight-semibold)] [color:var(--content-secondary)]",
          AVATAR_SIZE[size]
        )}
      >
        {image ? (
          <Image src={image} alt={name} width={32} height={32} className="size-full object-cover" />
        ) : (
          <span className="leading-none">{name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      {presence ? (
        <PresenceDot
          presence={presence}
          className={cn(
            "ring-surface-panel absolute -right-0.5 -bottom-0.5 ring-2",
            DOT_INSET[size]
          )}
        />
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ PersonChip */

export type PersonChipProps = {
  name: string;
  image?: string;
  presence?: Presence;
  /** When set, renders a removable token with a trailing ✕. */
  onRemove?: () => void;
  className?: string;
  children?: ReactNode;
};

/** An inline person reference: a small avatar + name, optionally removable. */
export function PersonChip({
  name,
  image,
  presence,
  onRemove,
  className,
  children,
}: PersonChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        onRemove &&
          "bg-surface-hover rounded-[var(--radius-full)] py-0.5 pr-1 pl-1",
        className
      )}
    >
      <PresenceAvatar name={name} image={image} presence={presence} size="sm" />
      <span className="text-ui-small truncate [color:var(--content-primary)]">
        {children ?? name}
      </span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className="focus-ring grid size-4 place-items-center rounded-full [color:var(--content-tertiary)] hover:[color:var(--content-primary)] [&_svg]:size-3"
        >
          <X />
        </button>
      ) : null}
    </span>
  );
}
