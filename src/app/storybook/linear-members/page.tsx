"use client";

import {
  IconButton,
  InviteField,
  MemberList,
  MemberRow,
  PendingInviteRow,
  PersonChip,
  PresenceAvatar,
  PresenceDot,
  RoleBadge,
  RoleSelect,
  SettingsGroupHeader,
  SidebarNavItem,
  type MemberRole,
} from "@/components/orbit";
import { DotsThree } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";

function CatalogSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border-subtle border-t py-9">
      <div className="mb-5">
        <h2 className="text-heading-small font-semibold tracking-[var(--tracking-heading)]">
          {title}
        </h2>
        <p className="text-ui-small text-content-tertiary mt-1 max-w-2xl">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function LinearMembersStorybook() {
  const [invite, setInvite] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [bruRole, setBruRole] = useState<MemberRole>("member");

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 17
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear people, members &amp; settings
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          Presence, avatars, person chips, the settings members table, role
          controls, pending invites, and the invite bar — ground-truthed on
          linear.app/settings/members (50px rows · 12px roles · presence dots).
        </p>
      </header>

      <CatalogSection
        title="Presence & people"
        description="Presence dots, avatars with presence, and inline person chips."
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <PresenceDot presence="online" /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <PresenceDot presence="away" /> Away
            </span>
            <span className="flex items-center gap-1.5">
              <PresenceDot presence="dnd" /> DND
            </span>
            <span className="flex items-center gap-1.5">
              <PresenceDot presence="offline" /> Offline
            </span>
          </div>
          <div className="flex items-center gap-3">
            <PresenceAvatar name="Alex" presence="online" />
            <PresenceAvatar name="Bru" presence="away" size="lg" />
            <PresenceAvatar name="Cy" presence="dnd" size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <PersonChip name="Alex" presence="online" />
            <PersonChip name="Bru" presence="away" onRemove={() => {}} />
          </div>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Members table"
        description="The settings member list: avatar, name/email, role control, meta and a row menu."
      >
        <div className="border-border-default bg-surface-panel rounded-[var(--radius-panel)] border px-4">
          <MemberList
            header={
              <>
                <span className="flex-1">Member</span>
                <span className="w-24">Role</span>
              </>
            }
          >
            <MemberRow
              name="Munkherdene"
              email="muunuu960@gmail.com"
              presence="online"
              meta="1 team · Aug 21"
              role={<RoleBadge role="owner" />}
              actions={
                <IconButton aria-label="Member options" size="sm">
                  <DotsThree />
                </IconButton>
              }
            />
            <MemberRow
              name="Bru"
              email="bru@moon.dev"
              presence="away"
              meta="2 teams · Aug 19"
              role={<RoleSelect role={bruRole} onChange={setBruRole} />}
              actions={
                <IconButton aria-label="Member options" size="sm">
                  <DotsThree />
                </IconButton>
              }
            />
            <PendingInviteRow
              email="cy@moon.dev"
              actions={
                <IconButton aria-label="Invite options" size="sm">
                  <DotsThree />
                </IconButton>
              }
            />
          </MemberList>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Invite & settings nav"
        description="The invite bar and a settings sidebar section caption."
      >
        <div className="flex flex-col gap-6">
          <InviteField
            value={invite}
            onChange={setInvite}
            role={inviteRole}
            onRoleChange={setInviteRole}
            onInvite={() => setInvite("")}
            className="max-w-xl"
          />
          <div className="bg-sidebar border-border-subtle w-[240px] rounded-[var(--radius-panel)] border p-2">
            <SettingsGroupHeader>Workspace</SettingsGroupHeader>
            <SidebarNavItem label="Members" active />
            <SidebarNavItem label="Teams" />
            <SettingsGroupHeader className="mt-2">Personal</SettingsGroupHeader>
            <SidebarNavItem label="Preferences" />
            <SidebarNavItem label="Notifications" />
          </div>
        </div>
      </CatalogSection>
    </main>
  );
}
