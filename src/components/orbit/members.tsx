"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Input } from "./input";
import { PresenceAvatar, type Presence } from "./presence";

/*
 * Settings › Members surfaces. Ground-truthed on linear.app/settings/members:
 * a 50px member row (avatar · name/email · role · meta · presence) and a role
 * control rendered as a small (12px) label/menu.
 */

export type MemberRole = "owner" | "admin" | "member" | "guest";

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

/* ------------------------------------------------------------------ RoleBadge */

/** A quiet role label (12px, muted) — the read-only form of a member's role. */
export function RoleBadge({
  role,
  className,
}: {
  role: MemberRole;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-ui-small [color:var(--content-tertiary)]",
        className
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

/* ----------------------------------------------------------------- RoleSelect */

const ROLE_ORDER: MemberRole[] = ["owner", "admin", "member", "guest"];

/** A dropdown that changes a member's role. */
export function RoleSelect({
  role,
  onChange,
  roles = ROLE_ORDER,
  disabled,
  className,
}: {
  role: MemberRole;
  onChange: (role: MemberRole) => void;
  roles?: MemberRole[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label="Change role"
        className={cn(
          "focus-ring text-ui-small inline-flex h-7 items-center gap-1 rounded-[var(--radius-control)] px-2 [color:var(--content-secondary)] hover:bg-surface-hover data-[state=open]:bg-surface-hover disabled:pointer-events-none disabled:opacity-60",
          className
        )}
      >
        {ROLE_LABEL[role]}
        <ChevronsUpDown className="size-3.5 [color:var(--content-tertiary)]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {roles.map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => onChange(r)}
            className="text-ui-default flex items-center justify-between"
          >
            {ROLE_LABEL[r]}
            {r === role ? (
              <Check className="size-4 [color:var(--content-secondary)]" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ MemberRow */

export type MemberRowProps = {
  name: ReactNode;
  email: ReactNode;
  image?: string;
  presence?: Presence;
  /** The role control — a <RoleBadge> or an interactive <RoleSelect>. */
  role?: ReactNode;
  /** Secondary metadata (e.g. "1 team · Joined Aug 21"). */
  meta?: ReactNode;
  /** Trailing actions (a "⋯" menu, remove, etc.). */
  actions?: ReactNode;
  className?: string;
};

/** A member list row: avatar + name/email, a role control and trailing meta. */
export function MemberRow({
  name,
  email,
  image,
  presence,
  role,
  meta,
  actions,
  className,
}: MemberRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-[50px] items-center gap-3 py-2",
        className
      )}
    >
      <PresenceAvatar
        name={typeof name === "string" ? name : "?"}
        image={image}
        presence={presence}
        size="base"
      />
      <div className="min-w-0 flex-1">
        <div className="text-ui-default truncate [color:var(--content-primary)]">
          {name}
        </div>
        <div className="text-ui-small truncate [color:var(--content-tertiary)]">
          {email}
        </div>
      </div>
      {meta ? (
        <div className="text-ui-small hidden shrink-0 [color:var(--content-tertiary)] sm:block">
          {meta}
        </div>
      ) : null}
      {role ? <div className="shrink-0">{role}</div> : null}
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- PendingInviteRow */

/** A pending invitation row: the invited email, a status pill, resend/revoke. */
export function PendingInviteRow({
  email,
  status = "Pending",
  actions,
  className,
}: {
  email: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[50px] items-center gap-3 py-2",
        className
      )}
    >
      <span className="bg-surface-hover grid size-6 shrink-0 place-items-center rounded-full text-[10px] leading-none font-[var(--weight-semibold)] [color:var(--content-tertiary)]">
        @
      </span>
      <div className="text-ui-default min-w-0 flex-1 truncate [color:var(--content-secondary)]">
        {email}
      </div>
      <span className="text-ui-caption bg-surface-hover shrink-0 rounded-[var(--radius-full)] px-2 py-0.5 [color:var(--content-tertiary)]">
        {status}
      </span>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- MemberList */

/** A divided list of member / invite rows with an optional column header. */
export function MemberList({
  header,
  children,
  className,
}: {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {header ? (
        <div className="text-ui-caption border-border-subtle flex items-center border-b pb-1.5 font-[var(--weight-medium)] [color:var(--content-tertiary)]">
          {header}
        </div>
      ) : null}
      <div className="divide-border-subtle divide-y">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- InviteField */

/** The invite bar: an email field, a role picker and the Invite action. */
export function InviteField({
  value,
  onChange,
  onInvite,
  role = "member",
  onRoleChange,
  placeholder = "email@example.com",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onInvite: () => void;
  role?: MemberRole;
  onRoleChange?: (role: MemberRole) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="email"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
      {onRoleChange ? (
        <RoleSelect
          role={role}
          onChange={onRoleChange}
          className="border-border-default border"
        />
      ) : null}
      <Button
        variant="primary"
        size="base"
        title="Invite"
        onClick={onInvite}
        disabled={!value.trim()}
      />
    </div>
  );
}
