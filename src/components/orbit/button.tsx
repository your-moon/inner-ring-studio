import { Loader } from "@/components/orbit/loader";
import { cn } from "@/lib/utils";
import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

/*
 * The visual layer is the crisp design system's generated ActionButton recipe
 * (src/styles/crisp/action-button.css, generated in the crisp repo from the
 * Attio-measured token sources). This file only maps the Orbit Button API onto
 * the generated `.seed-action-button` classes — no styling is authored here.
 */
const BUTTON_VARIANTS = {
  primary: "seed-action-button--variant_brandSolid",
  secondary: "seed-action-button--variant_neutralOutline",
  ghost: "seed-action-button--variant_ghost",
  destructive: "seed-action-button--variant_criticalSolid",
} as const;

// Orbit sm/base/lg → crisp small(28) / medium(32) / large(36).
const BUTTON_SIZES = {
  sm: "seed-action-button--size_small [&_svg]:size-[var(--icon-sm)]",
  base: "seed-action-button--size_medium [&_svg]:size-[var(--icon-md)]",
  lg: "seed-action-button--size_large [&_svg]:size-[var(--icon-md)]",
} as const;

// qvism emits size×layout compounds as single concatenated classes.
const CRISP_SIZE = { sm: "small", base: "medium", lg: "large" } as const;
const crispLayout = (shape: "base" | "square") =>
  shape === "square" ? "iconOnly" : "withText";
const crispCompound = (size: ButtonSize, shape: "base" | "square") =>
  `seed-action-button--layout_${crispLayout(shape)} seed-action-button--size_${CRISP_SIZE[size]}-layout_${crispLayout(shape)}`;

// Persistent "on" state — the recipe's pressed styles key off aria-pressed,
// this adds the selected surface for the quiet variants.
const BUTTON_TOGGLED_VARIANTS = {
  primary: "brightness-[1.06]",
  secondary: "!bg-surface-selected",
  ghost: "!bg-surface-selected [color:var(--content-primary)]",
  destructive: "brightness-[1.06]",
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
    "seed-action-button relative shrink-0",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    crispCompound(size, shape),
    // Link-mode disabling is aria-only; native buttons get :disabled from crisp.
    "aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    "data-[loading=true]:opacity-100",
    toggled && BUTTON_TOGGLED_VARIANTS[variant],
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
