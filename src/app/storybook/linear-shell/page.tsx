"use client";

import {
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandMenu,
  CommandRow,
  Kbd,
  SidebarButton,
  SidebarFavorite,
  SidebarNavItem,
  SidebarSection,
  SidebarToggle,
  SubscribeToggle,
} from "@/components/orbit";
import {
  ArrowRight,
  Bell,
  CirclesFour,
  DownloadSimple,
  GithubLogo,
  Layout,
  MagnifyingGlass,
  Plus,
  Stack,
  Tray,
  UserPlus,
} from "@phosphor-icons/react";
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

export default function LinearShellStorybook() {
  const [nav, setNav] = useState("inbox");
  const [subscribed, setSubscribed] = useState(true);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-2 pt-8 pb-24 sm:px-6">
      <header className="border-border-subtle border-b pb-8">
        <div className="text-ui-caption text-content-link mb-2 font-medium tracking-[0.08em] uppercase">
          PMSQL UI / 16
        </div>
        <h1 className="text-heading-large font-semibold tracking-[-0.025em]">
          Linear navigation shell &amp; command palette
        </h1>
        <p className="text-body text-content-secondary mt-2 max-w-2xl">
          The left-nav rows, collapsible sections, favorites, the ⌘K command
          menu, and the issue subscribe pill — ground-truthed on linear.app
          (28px rows · 8px radius · 12px menu frame · 32px pill).
        </p>
      </header>

      <CatalogSection
        title="Sidebar navigation"
        description="Primary nav rows (28px, 8px radius), collapsible sections, favorites, and quiet action rows."
      >
        <div className="bg-sidebar border-border-subtle w-[260px] rounded-[var(--radius-panel)] border p-2">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-ui-small font-semibold">Moon</span>
            <SidebarToggle />
          </div>
          <div className="flex flex-col gap-px">
            <SidebarNavItem
              icon={<Tray />}
              label="Inbox"
              count={3}
              active={nav === "inbox"}
              onClick={() => setNav("inbox")}
            />
            <SidebarNavItem
              icon={<CirclesFour />}
              label="My issues"
              active={nav === "mine"}
              onClick={() => setNav("mine")}
            />
          </div>

          <SidebarSection title="Favorites" onAdd={() => {}} className="mt-3">
            <SidebarFavorite
              icon={<Stack />}
              label="Postgres proxy"
              favorited
              onToggleFavorite={() => {}}
            />
            <SidebarFavorite
              icon={<Layout />}
              label="Active cycle"
              favorited
              onToggleFavorite={() => {}}
            />
          </SidebarSection>

          <SidebarSection title="Your teams" className="mt-3">
            <SidebarNavItem
              icon={<CirclesFour />}
              label="Issues"
              active={nav === "issues"}
              onClick={() => setNav("issues")}
            />
            <SidebarNavItem
              icon={<Layout />}
              label="Projects"
              active={nav === "projects"}
              onClick={() => setNav("projects")}
            />
          </SidebarSection>

          <SidebarSection title="Try" defaultOpen className="mt-3">
            <SidebarButton icon={<DownloadSimple />} label="Import issues" />
            <SidebarButton icon={<UserPlus />} label="Invite people" />
            <SidebarButton icon={<GithubLogo />} label="Connect GitHub" />
          </SidebarSection>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Command palette"
        description="The ⌘K menu frame: search header, grouped rows, empty state, and the keyboard-hint footer."
      >
        <div className="flex flex-wrap items-start gap-6">
          <CommandMenu footer={<CommandFooter />}>
            <CommandGroup heading="Issue">
              <CommandRow
                icon={<Plus />}
                label="Create new issue"
                shortcut={<Kbd>C</Kbd>}
              />
              <CommandRow
                icon={<ArrowRight />}
                label="Go to issue…"
                shortcut={<Kbd>G</Kbd>}
              />
            </CommandGroup>
            <CommandGroup heading="Navigation">
              <CommandRow icon={<Tray />} label="Open inbox" hint="3 unread" />
              <CommandRow icon={<MagnifyingGlass />} label="Search…" />
              <CommandRow icon={<Bell />} label="Notification settings" />
            </CommandGroup>
          </CommandMenu>

          <CommandMenu footer={<CommandFooter />} className="w-[360px]">
            <CommandEmpty>No results for “xyzzy”.</CommandEmpty>
          </CommandMenu>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Subscribe"
        description="The issue subscribe pill (32px, radius-full)."
      >
        <SubscribeToggle
          subscribed={subscribed}
          onToggle={() => setSubscribed((v) => !v)}
        />
      </CatalogSection>
    </main>
  );
}
