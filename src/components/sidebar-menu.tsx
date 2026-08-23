import { cn } from "@/lib/utils";
import Link from "next/link";
import { ReactElement } from "react";

interface SidebarMenuItemProps {
  text: string;
  badge?: ReactElement;
  onClick?: () => void;
  href?: string;
  selected?: boolean;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface SidebarMenuHeader {
  text: string;
}

export function SidebarMenuLoadingItem() {
  const className =
    "flex p-2 pl-4 text-sm hover:cursor-pointer h-8 items-center";

  return (
    <div className={className}>
      <span className="mr-2 h-4 w-4">
        <span className="bg-muted inline-flex h-4 w-4 animate-pulse rounded-full"></span>
      </span>
      <span className="flex flex-1 items-center text-left">
        <span className="bg-muted mr-5 inline-flex h-3 w-full animate-pulse rounded-sm"></span>
      </span>
    </div>
  );
}

export function SidebarMenuItem({
  text,
  onClick,
  icon: IconComponent,
  badge,
  href,
  selected,
}: SidebarMenuItemProps) {
  // Linear-style inset row: rounded, compact, muted by default, a quiet filled
  // state when selected. Motion (.u-smooth) keeps hover/selection soft.
  const className =
    "group mx-2 flex h-7 items-center gap-2 rounded-md px-2 text-[13px] u-smooth hover:cursor-pointer";
  const state = selected
    ? "bg-secondary font-medium text-foreground"
    : "text-muted-foreground hover:bg-secondary hover:text-foreground";

  const body = (
    <>
      {IconComponent ? (
        <IconComponent className="h-4 w-4 shrink-0" />
      ) : (
        <span className="h-4 w-4 shrink-0"></span>
      )}

      <span className="flex-1 truncate text-left">{text}</span>

      {badge && badge}
    </>
  );

  if (href) {
    if (href.startsWith("https://")) {
      return (
        <Link href={href} className={cn(className, state)} target="_blank">
          {body}
        </Link>
      );
    }

    return (
      <Link href={href} className={cn(className, state)}>
        {body}
      </Link>
    );
  }

  return (
    <button className={cn(className, state)} onClick={onClick}>
      {body}
    </button>
  );
}

export function SidebarMenuHeader({ text }: SidebarMenuHeader) {
  return (
    <div className="mt-5 mb-1 px-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      {text}
    </div>
  );
}
