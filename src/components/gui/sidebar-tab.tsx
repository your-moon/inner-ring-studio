import { useStudioContext } from "@/context/driver-provider";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "@phosphor-icons/react";
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

export interface SidebarTabItem {
  key: string;
  icon: ReactElement;
  name: string;
  content?: ReactElement;
  onClick?: () => void;
}

interface SidebarTabProps {
  tabs: SidebarTabItem[];
}

export default function SidebarTab({ tabs }: Readonly<SidebarTabProps>) {
  const { forcedTheme } = useTheme();
  const searchParams = useSearchParams();

  // Deep-link the active sidebar tab via ?sidebar=<key>.
  const initialIndex = (() => {
    const k = searchParams.get("sidebar");
    const i = k ? tabs.findIndex((t) => t.key === k) : -1;
    return i >= 0 ? i : 0;
  })();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [loadedIndex, setLoadedIndex] = useState(() => {
    const a: boolean[] = new Array(tabs.length).fill(false);
    a[initialIndex] = true;
    return a;
  });

  const disableToggle =
    searchParams.get("disableThemeToggle") === "1" || forcedTheme;

  const config = useStudioContext();

  return (
    <div className={cn("flex h-full bg-sidebar")}>
      <div className={cn("shrink-0")}>
        <div className="flex h-full flex-col gap-3 border-r border-border p-3">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger>
              <div className="mb-2 ml-1 flex h-8 w-8 items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-9 w-9 cursor-pointer text-black dark:text-white"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                </svg>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <div
                className="m-1 mb-2 flex h-[120px] w-[250px] flex-col justify-end rounded"
                style={{
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <div
                  className="p-1 px-2 text-white"
                  style={{ background: "#000C" }}
                >
                  <div className="font-bold">Inner Ring Studio</div>
                  <div className="-mt-0.5 text-xs">
                    v{process.env.NEXT_PUBLIC_STUDIO_VERSION}
                  </div>
                </div>
              </div>

              {!disableToggle && (
                <div className="flex p-2">
                  <ThemeToggle />
                </div>
              )}

              {config.onBack && (
                <DropdownMenuItem onClick={config.onBack}>
                  <ArrowLeft className="mr-2" />
                  Back to bases
                </DropdownMenuItem>
              )}
              {config.onBack && <DropdownMenuSeparator />}
              <DropdownMenuItem inset>
                <Link
                  className="block w-full"
                  href="https://github.com/your-moon/inner-ring-studio/issues"
                  target="_blank"
                >
                  Report issues
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem inset>
                <Link
                  className="block w-full"
                  href="https://github.com/your-moon/inner-ring-studio"
                  target="_blank"
                >
                  About
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {tabs.map(({ key, name, icon, onClick }, idx) => {
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (onClick) {
                        onClick();
                        return;
                      }

                      if (!loadedIndex[idx]) {
                        loadedIndex[idx] = true;
                        setLoadedIndex([...loadedIndex]);
                      }

                      if (idx !== selectedIndex) {
                        setSelectedIndex(idx);
                      }

                      // Reflect the active tab in the URL so it's shareable /
                      // restorable, without a full navigation.
                      try {
                        const url = new URL(window.location.href);
                        url.searchParams.set("sidebar", key);
                        window.history.replaceState(null, "", url);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className={cn(
                      "u-smooth flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground",
                      selectedIndex === idx
                        ? "bg-secondary text-foreground"
                        : undefined
                    )}
                  >
                    {icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="relative flex h-full grow overflow-hidden">
        {tabs
          .filter((tab) => tab.content)
          .map((tab, tabIndex) => {
            const selected = selectedIndex === tabIndex;

            return (
              <div
                key={tab.key}
                style={{
                  contentVisibility: selected ? "auto" : "hidden",
                  zIndex: selected ? 0 : -1,
                  position: "absolute",
                  display: "flex",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: 0,
                }}
              >
                {loadedIndex[tabIndex] && tab.content}
              </div>
            );
          })}
      </div>
    </div>
  );
}
