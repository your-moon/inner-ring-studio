"use client";

import { ChevronRight, PanelLeft, Plus, Star } from "lucide-react";
import {
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import IconButton from "./icon-button";

/*
 * Linear's left navigation shell. Ground-truthed against linear.app:
 *   · nav row       28px tall, 8px radius, 13px label, active = raised surface
 *   · section head  28px, 13px, tertiary colour, sentence case (not uppercase)
 * The row height/radius come from --radius-control (8px) and h-7 (28px).
 */

/* -------------------------------------------------------------- SidebarNavItem */

type NavElement = "a" | "button";

export type SidebarNavItemProps = {
  icon?: ReactNode;
  label: ReactNode;
  /** Trailing count / badge (unread inbox, issue count). */
  count?: ReactNode;
  active?: boolean;
  href?: string;
  as?: NavElement;
  onClick?: () => void;
  className?: string;
};

/** A primary sidebar row: leading icon, label, optional trailing count. */
export function SidebarNavItem({
  icon,
  label,
  count,
  active = false,
  href,
  as,
  onClick,
  className,
}: SidebarNavItemProps) {
  const Comp = (as ?? (href ? "a" : "button")) as NavElement;
  return (
    <Comp
      {...(Comp === "a" ? { href } : { type: "button" })}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring text-ui-small group/nav flex h-7 w-full items-center gap-2 rounded-[var(--radius-control)] px-2 text-left [&_svg]:size-4",
        active
          ? "bg-surface-hover [color:var(--content-primary)] font-[var(--weight-medium)]"
          : "[color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
        className
      )}
    >
      {icon ? (
        <span className="shrink-0 [color:var(--content-tertiary)] group-aria-[current=page]/nav:[color:var(--content-secondary)]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null ? (
        <span className="text-ui-caption shrink-0 [color:var(--content-tertiary)] [font-variant-numeric:tabular-nums]">
          {count}
        </span>
      ) : null}
    </Comp>
  );
}

/* --------------------------------------------------------------- SidebarSection */

export type SidebarSectionProps = {
  title: ReactNode;
  children: ReactNode;
  /** Start collapsed. Section body toggles via the header disclosure. */
  defaultOpen?: boolean;
  collapsible?: boolean;
  /** Optional add control revealed on hover (a "+"). */
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
};

/** A collapsible sidebar group: a quiet caption header over its rows. */
export function SidebarSection({
  title,
  children,
  defaultOpen = true,
  collapsible = true,
  onAdd,
  addLabel = "Add",
  className,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="group/sec flex h-7 items-center gap-1 pr-1 pl-2">
        <button
          type="button"
          onClick={collapsible ? () => setOpen((v) => !v) : undefined}
          aria-expanded={collapsible ? open : undefined}
          className={cn(
            "text-ui-small flex min-w-0 flex-1 items-center gap-1 text-left [color:var(--content-tertiary)]",
            collapsible && "hover:[color:var(--content-secondary)]"
          )}
        >
          {collapsible ? (
            <ChevronRight
              className={cn(
                "size-3 shrink-0 opacity-0 transition-transform duration-[var(--motion-fast)] group-hover/sec:opacity-100",
                open && "rotate-90"
              )}
            />
          ) : null}
          <span className="truncate font-[var(--weight-medium)]">{title}</span>
        </button>
        {onAdd ? (
          <IconButton
            aria-label={addLabel}
            size="sm"
            onClick={onAdd}
            className="opacity-0 group-hover/sec:opacity-100"
          >
            <Plus />
          </IconButton>
        ) : null}
      </div>
      {(!collapsible || open) && (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- SidebarFavorite */

export type SidebarFavoriteProps = {
  icon?: ReactNode;
  label: ReactNode;
  active?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  href?: string;
  onClick?: () => void;
  className?: string;
};

/** A favorited (starred) sidebar row — the star sits trailing and fills when set. */
export function SidebarFavorite({
  icon,
  label,
  active,
  favorited = true,
  onToggleFavorite,
  href,
  onClick,
  className,
}: SidebarFavoriteProps) {
  return (
    <div className={cn("group/fav relative flex items-center", className)}>
      <SidebarNavItem
        icon={icon}
        label={label}
        active={active}
        href={href}
        onClick={onClick}
        className="pr-8"
      />
      {onToggleFavorite ? (
        <IconButton
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={favorited}
          size="sm"
          onClick={onToggleFavorite}
          className={cn(
            "absolute right-1",
            favorited
              ? "[color:var(--intent-warning)]"
              : "opacity-0 group-hover/fav:opacity-100"
          )}
        >
          <Star />
        </IconButton>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- SidebarButton */

export type SidebarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  label: ReactNode;
};

/** A quiet full-width action row (onboarding / "Try": Import issues, Invite…). */
export function SidebarButton({
  icon,
  label,
  className,
  ...props
}: SidebarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring text-ui-small flex h-7 w-full items-center gap-2 rounded-[var(--radius-control)] px-2 text-left [color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)] [&_svg]:size-4",
        className
      )}
      {...props}
    >
      {icon ? (
        <span className="shrink-0 [color:var(--content-tertiary)]">{icon}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- SidebarToggle */

export type SidebarToggleProps = {
  onClick?: () => void;
  className?: string;
};

/** Collapse/expand the sidebar rail. */
export function SidebarToggle({ onClick, className }: SidebarToggleProps) {
  return (
    <IconButton
      aria-label="Toggle sidebar"
      onClick={onClick}
      className={className}
    >
      <PanelLeft />
    </IconButton>
  );
}
