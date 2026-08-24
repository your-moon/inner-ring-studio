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
            <SidebarMenuHeader text="Foundation" />
            <SidebarMenuItem
              icon={Palette}
              text="Foundations"
              href="/storybook/foundations"
            />
            <SidebarMenuHeader text="Orbit Design System" />
            <SidebarMenuItem
              icon={Layers2}
              text="Avatar"
              href="/storybook/avatar"
            />
            <SidebarMenuItem
              icon={Layers2}
              text="Badges & Kbd"
              href="/storybook/badges"
            />
            <SidebarMenuItem
              icon={Layers2}
              text="Button"
              href="/storybook/button"
            />
            <SidebarMenuItem
              icon={Layers2}
              text="Form controls"
              href="/storybook/form"
            />
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
