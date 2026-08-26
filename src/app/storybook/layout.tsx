import ClientOnly from "@/components/client-only";
import { SidebarMenuHeader, SidebarMenuItem } from "@/components/sidebar-menu";
import ThemeToggle from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layers2, Palette } from "lucide-react";
import Link from "next/link";
import ThemeLayout from "../(theme)/theme_layout";

export default function StorybookRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <ThemeLayout>
        <div className="bg-surface-canvas flex h-screen w-screen overflow-hidden">
          <aside className="bg-sidebar hidden w-[260px] shrink-0 flex-col overflow-y-auto border-r border-border-subtle md:flex">
            <div className="flex p-2">
              <ThemeToggle />
            </div>

            <SidebarMenuItem
              icon={Layers2}
              text="Guideline"
              href="/storybook"
            />

            <SidebarMenuHeader text="Crisp Design System" />
            <SidebarMenuItem icon={Palette} text="Foundations" href="/storybook/foundations" />
            <SidebarMenuItem icon={Layers2} text="Button" href="/storybook/button" />
            <SidebarMenuItem icon={Layers2} text="Input & fields" href="/storybook/input" />
            <SidebarMenuItem icon={Layers2} text="Form controls" href="/storybook/form" />
            <SidebarMenuItem icon={Layers2} text="Select" href="/storybook/select" />
            <SidebarMenuItem icon={Layers2} text="Menus & overlays" href="/storybook/overlays" />
            <SidebarMenuItem icon={Layers2} text="Collection table" href="/storybook/table" />
            <SidebarMenuItem icon={Layers2} text="Patterns: record & controls" href="/storybook/attio" />

            <SidebarMenuHeader text="Product" />
            <SidebarMenuItem icon={Layers2} text="Example: Dashboard" href="/storybook/dashboard" />
            <SidebarMenuItem icon={Layers2} text="PMSQL product" href="/storybook/product" />
            <SidebarMenuItem icon={Layers2} text="CRUD & detail" href="/storybook/crud" />
            <SidebarMenuItem icon={Layers2} text="Views & pickers" href="/storybook/views" />
            <SidebarMenuItem icon={Layers2} text="Navigation" href="/storybook/navigation" />
            <SidebarMenuItem icon={Layers2} text="Data display" href="/storybook/data-display" />
            <SidebarMenuItem icon={Layers2} text="Feedback" href="/storybook/feedback" />
            <SidebarMenuItem icon={Layers2} text="Badges & Kbd" href="/storybook/badges" />
            <SidebarMenuItem icon={Layers2} text="Avatar" href="/storybook/avatar" />
            <SidebarMenuItem icon={Layers2} text="Layout" href="/storybook/layout-primitives" />
            <SidebarMenuItem icon={Layers2} text="Illustrations" href="/storybook/illustrations" />

            <SidebarMenuHeader text="Legacy (pre-crisp studies)" />
            <SidebarMenuItem icon={Layers2} text="Linear patterns" href="/storybook/linear" />
            <SidebarMenuItem icon={Layers2} text="Linear board & detail" href="/storybook/linear-board" />
            <SidebarMenuItem icon={Layers2} text="Linear collab & projects" href="/storybook/linear-collab" />
            <SidebarMenuItem icon={Layers2} text="Linear nav & command" href="/storybook/linear-shell" />
            <SidebarMenuItem icon={Layers2} text="Linear people & members" href="/storybook/linear-members" />
            <SidebarMenuItem icon={Layers2} text="Linear settings & labels" href="/storybook/linear-settings" />
            <SidebarMenuItem icon={Layers2} text="Linear rich-text editor" href="/storybook/linear-editor" />
            <SidebarMenuItem icon={Layers2} text="Linear insights & charts" href="/storybook/linear-insights" />
            <SidebarMenuItem icon={Layers2} text="Linear projects & cycles" href="/storybook/linear-project-cycle" />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="bg-surface-panel flex h-12 shrink-0 items-center justify-between border-b border-border-subtle px-3 md:hidden">
              <Link
                href="/storybook/foundations"
                className="focus-ring text-ui-small rounded-[var(--radius-small)] font-semibold"
              >
                PMSQL UI
              </Link>
              <ThemeToggle />
            </header>
            <div className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <TooltipProvider>{children}</TooltipProvider>
            </div>
          </div>
        </div>
      </ThemeLayout>
    </ClientOnly>
  );
}
