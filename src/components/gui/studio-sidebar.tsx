"use client";

import EnvBadge from "@/components/orbit/env-badge";
import Kbd from "@/components/ui/kbd";
import { useStudioContext } from "@/context/driver-provider";
import { cn } from "@/lib/utils";
import { ArrowLeft, CaretLeft, DotsThree, MagnifyingGlass } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReactElement, useState } from "react";
import ThemeToggle from "../theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SchemaView from "./schema-sidebar";

export interface SidebarPanel {
  key: string;
  icon: ReactElement;
  name: string;
  content?: ReactElement;
  onClick?: () => void;
}

/**
 * The unified studio sidebar (the mock's shell): one column — connection
 * header with env badge, a ⌘K jump affordance, and the schema tree as the
 * permanent body. Secondary panels (Databases, Queries, Tools, extensions)
 * swap the body via quiet header icons instead of a dedicated icon rail.
 */
export default function StudioSidebar({
  panels,
}: Readonly<{ panels: SidebarPanel[] }>) {
  const { name, environment, onBack } = useStudioContext();
  const { forcedTheme } = useTheme();
  const searchParams = useSearchParams();

  // Honor the old ?sidebar=<key> deep link for the swappable panels.
  const [activeKey, setActiveKey] = useState<string | null>(() => {
    const k = searchParams.get("sidebar");
    return k && panels.some((p) => p.key === k && p.content) ? k : null;
  });
  const active = panels.find((p) => p.key === activeKey);

  const disableToggle =
    searchParams.get("disableThemeToggle") === "1" || forcedTheme;

  const togglePanel = (p: SidebarPanel) => {
    if (p.onClick) return p.onClick();
    const next = activeKey === p.key ? null : p.key;
    setActiveKey(next);
    try {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("sidebar", next);
      else url.searchParams.delete("sidebar");
      window.history.replaceState(null, "", url);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      {/* Connection header */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2.5 pb-1">
        {onBack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onBack}
                className="u-smooth grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Back to home"
              >
                <CaretLeft size={13} weight="bold" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to home</TooltipContent>
          </Tooltip>
        )}
        <span className="min-w-0 truncate px-0.5 text-[13px] font-medium text-foreground">
          {name}
        </span>
        <EnvBadge environment={environment} />
        <span className="flex-1" />
        {panels.map((p) => (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => togglePanel(p)}
                className={cn(
                  "u-smooth grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground [&_svg]:h-[15px] [&_svg]:w-[15px]",
                  activeKey === p.key && "bg-secondary text-foreground"
                )}
                aria-label={p.name}
              >
                {p.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{p.name}</TooltipContent>
          </Tooltip>
        ))}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className="u-smooth grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="More"
            >
              <DotsThree size={15} weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            {!disableToggle && (
              <div className="flex p-2">
                <ThemeToggle />
              </div>
            )}
            {onBack && (
              <DropdownMenuItem onClick={onBack}>
                <ArrowLeft className="mr-2" />
                Back to home
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem inset>
              <Link
                className="block w-full"
                href="https://github.com/your-moon/inner-ring-studio/issues"
                target="_blank"
              >
                Report issues
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem inset disabled>
              v{process.env.NEXT_PUBLIC_STUDIO_VERSION}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Jump affordance — same surface the ⌘K shortcut opens. */}
      <button
        onClick={() => window.dispatchEvent(new Event("irs:studio-cmdk"))}
        className="u-smooth mx-2 mt-1 mb-1 flex h-[30px] shrink-0 items-center gap-2 rounded-[7px] border border-border bg-background px-2.5 text-left text-[13px] text-muted-foreground hover:border-ring/40"
      >
        <MagnifyingGlass size={13} className="shrink-0" />
        <span className="flex-1">Jump to…</span>
        <Kbd>
          {typeof navigator !== "undefined" &&
          navigator.userAgent.toLowerCase().includes("mac")
            ? "⌘K"
            : "Ctrl K"}
        </Kbd>
      </button>

      {/* Body: schema tree by default, or the active secondary panel. */}
      <div className="relative min-h-0 flex-1">
        <div
          className={cn("flex h-full", active?.content && "hidden")}
        >
          <SchemaView />
        </div>
        {active?.content && (
          <div className="flex h-full">{active.content}</div>
        )}
      </div>
    </div>
  );
}
