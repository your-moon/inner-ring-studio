import { Loader } from "@/components/orbit/loader";
import { cn } from "@/lib/utils";
import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

const BUTTON_VARIANTS = {
  primary:
    "border-primary bg-primary [color:var(--primary-foreground)] shadow-[var(--shadow-raised)] hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)]",
  secondary:
    "border-border-default bg-surface-raised [color:var(--content-primary)] shadow-[var(--shadow-raised)] hover:border-border-strong hover:bg-surface-hover",
  ghost:
    "border-transparent bg-transparent [color:var(--content-secondary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
  destructive:
    "border-intent-danger bg-intent-danger [color:var(--content-inverse)] shadow-[var(--shadow-raised)] hover:brightness-105",
} as const;

const BUTTON_TOGGLED_VARIANTS = {
  primary: "border-[var(--primary-hover)] bg-[var(--primary-hover)]",
  secondary: "border-border-strong bg-surface-selected",
  ghost:
    "border-border-subtle bg-surface-selected [color:var(--content-primary)]",
  destructive: "brightness-105",
} as const;

const BUTTON_SIZES = {
  sm: "h-7 gap-1.5 px-2.5 text-ui-small [line-height:var(--type-ui-small-line-height)] [&_svg]:size-[var(--icon-sm)]",
  base:
    "h-8 gap-1.5 px-3 text-ui-default [line-height:var(--type-ui-default-line-height)] [&_svg]:size-[var(--icon-md)]",
  lg: "h-9 gap-2 px-3.5 text-ui-default [line-height:var(--type-ui-default-line-height)] [&_svg]:size-[var(--icon-md)]",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "title"
> & {
  /** Render a Next.js link with `as="link"`, or provide another element type. */
  as?: ElementType | "link";
  children?: ReactNode;
  /** Places `children` before or after the visible `title` label. */
  displayContent?: "items-first" | "items-last";
  href?: LinkProps["href"];
  loading?: boolean;
  loadingLabel?: string;
  shape?: "base" | "square";
  size?: ButtonSize;
  /** Backwards-compatible visible label. Text children are also supported. */
  title?: ReactNode;
  toggled?: boolean;
  variant?: ButtonVariant;
};

function ButtonContent({
  children,
  displayContent,
  loading,
  loadingLabel,
  shape,
  size,
  title,
}: Required<
  Pick<
    ButtonProps,
    | "displayContent"
    | "loading"
    | "loadingLabel"
    | "shape"
    | "size"
  >
> &
  Pick<ButtonProps, "children" | "title">) {
  const label = shape === "square" ? null : title;
  const loaderSize = size === "sm" ? 14 : 16;

  return (
    <>
      <span
        className={cn(
          "inline-flex items-center justify-center gap-[inherit]",
          loading && "invisible",
        )}
        aria-hidden={loading || undefined}
      >
        {displayContent === "items-first" ? children : label}
        {displayContent === "items-first" ? label : children}
      </span>
      {loading ? (
        <>
          <Loader
            className="absolute inset-0 m-auto"
            size={loaderSize}
          />
          <span className="sr-only" role="status">
            {loadingLabel}
          </span>
        </>
      ) : null}
    </>
  );
}

/**
 * The shared text and icon button for product actions.
 *
 * Its 28/32/36px sizes, 12/13px labels, 500 weight, focus treatment, and
 * indigo action color are calibrated against Linear's current product UI.
 */
export function Button({
  as,
  children,
  disabled = false,
  className,
  displayContent = "items-last",
  href,
  loading = false,
  loadingLabel = "Loading",
  shape = "base",
  size = "base",
  title,
  toggled,
  variant = "secondary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const classes = cn(
    "focus-ring press relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] border font-[var(--weight-medium)] select-none",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "data-[loading=true]:opacity-100",
    "aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    toggled && BUTTON_TOGGLED_VARIANTS[variant],
    shape === "square" && "aspect-square px-0",
    className,
  );
  const content = (
    <ButtonContent
      displayContent={displayContent}
      loading={loading}
      loadingLabel={loadingLabel}
      shape={shape}
      size={size}
      title={title}
    >
      {children}
    </ButtonContent>
  );

  if (as === "link") {
    if (!href) {
      throw new Error('Button with as="link" requires an href.');
    }

    return (
      <Link
        className={classes}
        href={href}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        aria-pressed={toggled}
        data-loading={loading || undefined}
        data-state={toggled ? "on" : "off"}
        tabIndex={isDisabled ? -1 : props.tabIndex}
      >
        {content}
      </Link>
    );
  }

  const Component = as ?? "button";

  return (
    <Component
      className={classes}
      aria-busy={loading || undefined}
      aria-pressed={toggled}
      data-loading={loading || undefined}
      data-state={toggled ? "on" : "off"}
      disabled={isDisabled}
      {...props}
    >
      {content}
    </Component>
  );
}
