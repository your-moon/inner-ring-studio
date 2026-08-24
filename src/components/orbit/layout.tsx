"use client";

import { Slot } from "@radix-ui/react-slot";
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Layout primitives on one spacing scale, so every gap in the product is a
 * multiple of the 4px grid instead of an arbitrary margin. Stack/Inline/Grid
 * own spacing; components never set their own outer margins.
 */

export type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type Align = "start" | "center" | "end" | "stretch" | "baseline";
export type Justify = "start" | "center" | "end" | "between" | "around";

const GAP: Record<Gap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
  "2xl": "gap-8",
};

const ALIGN: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

type BaseProps = HTMLAttributes<HTMLDivElement> & { asChild?: boolean };

/** Vertical flow. The default building block for stacked content. */
export type StackProps = BaseProps & {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
};

export function Stack({
  asChild,
  gap = "md",
  align,
  justify,
  className,
  ...props
}: StackProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "flex flex-col",
        GAP[gap],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        className
      )}
      {...props}
    />
  );
}

/** Horizontal flow; centers on the cross axis and does not wrap by default. */
export type InlineProps = BaseProps & {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
};

export function Inline({
  asChild,
  gap = "sm",
  align = "center",
  justify,
  wrap = false,
  className,
  ...props
}: InlineProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "flex flex-row",
        wrap && "flex-wrap",
        GAP[gap],
        ALIGN[align],
        justify && JUSTIFY[justify],
        className
      )}
      {...props}
    />
  );
}

/** Wrapping group of similar items (chips, tags, filters). */
export type ClusterProps = BaseProps & { gap?: Gap; align?: Align };

export function Cluster({
  asChild,
  gap = "sm",
  align = "center",
  className,
  ...props
}: ClusterProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn("flex flex-wrap", GAP[gap], ALIGN[align], className)}
      {...props}
    />
  );
}

/** Fixed- or auto-column grid on the shared gap scale. */
export type GridProps = BaseProps & { columns?: number; gap?: Gap };

export function Grid({
  asChild,
  columns = 2,
  gap = "md",
  className,
  style,
  ...props
}: GridProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn("grid", GAP[gap], className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, ...style }}
      {...props}
    />
  );
}

/** Page width limiter with responsive inline padding. */
export type ContainerProps = BaseProps & { size?: "sm" | "md" | "lg" | "xl" };

const CONTAINER_SIZE = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-[1180px]",
} as const;

export function Container({
  asChild,
  size = "xl",
  className,
  ...props
}: ContainerProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        CONTAINER_SIZE[size],
        className
      )}
      {...props}
    />
  );
}

/** Centers its child on both axes. */
export function Center({ asChild, className, ...props }: BaseProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn("flex items-center justify-center", className)}
      {...props}
    />
  );
}

/** Flexible empty space; grows to push siblings apart in a flex row/column. */
export function Spacer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("flex-1", className)} {...props} />;
}

/** A hairline rule. Horizontal by default; vertical fills its row height. */
export type DividerProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function Divider({
  orientation = "horizontal",
  className,
  ...props
}: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-border-subtle shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}

/** Locks a box to a ratio (media, previews) via the CSS aspect-ratio. */
export type AspectRatioProps = HTMLAttributes<HTMLDivElement> & {
  ratio?: number;
};

export function AspectRatio({
  ratio = 16 / 9,
  className,
  style,
  ...props
}: AspectRatioProps) {
  return (
    <div
      className={cn("w-full overflow-hidden", className)}
      style={{ aspectRatio: String(ratio), ...style }}
      {...props}
    />
  );
}

/** A scroll region with a stable, quiet scrollbar gutter. */
export type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  maxHeight?: CSSProperties["maxHeight"];
};

export function ScrollArea({
  maxHeight,
  className,
  style,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={cn("min-h-0 overflow-y-auto overscroll-contain", className)}
      style={{ maxHeight, ...style }}
      {...props}
    />
  );
}

/** Visually hidden but available to screen readers. */
export function VisuallyHidden({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: ReactNode;
}) {
  const Comp: ElementType = asChild ? Slot : "span";
  return <Comp className="sr-only">{children}</Comp>;
}
