"use client";

import { CaretRight } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * A disclosure tree (schema explorer, nested settings). Rows are treeitems
 * with aria-expanded; depth is tracked by context so indentation is automatic.
 */
const DepthContext = createContext(0);

export function Tree({
  className,
  children,
  ...props
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul role="tree" className={cn("select-none", className)} {...props}>
      {children}
    </ul>
  );
}

export type TreeItemProps = {
  label: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  defaultExpanded?: boolean;
  children?: ReactNode;
  onSelect?: () => void;
};

export function TreeItem({
  label,
  icon,
  trailing,
  defaultExpanded = false,
  children,
  onSelect,
}: TreeItemProps) {
  const depth = useContext(DepthContext);
  const hasChildren = Boolean(children);
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className="group u-smooth hover:bg-surface-hover flex h-7 items-center gap-1.5 rounded-[6px] pr-2 text-ui-default"
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
      >
        <button
          type="button"
          aria-label={hasChildren ? (expanded ? "Collapse" : "Expand") : undefined}
          onClick={() => {
            if (hasChildren) setExpanded((v) => !v);
            onSelect?.();
          }}
          className="focus-ring -ml-0.5 flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-small)]"
        >
          {hasChildren ? (
            <CaretRight
              weight="bold"
              className={cn(
                "size-3 [color:var(--content-tertiary)] transition-transform",
                expanded && "rotate-90"
              )}
            />
          ) : null}
        </button>
        {icon ? (
          <span className="[color:var(--content-tertiary)] shrink-0 [&_svg]:size-[var(--icon-sm)]">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing ? (
          <span className="[color:var(--content-tertiary)] shrink-0">
            {trailing}
          </span>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <DepthContext.Provider value={depth + 1}>
          <ul role="group">{children}</ul>
        </DepthContext.Provider>
      ) : null}
    </li>
  );
}
