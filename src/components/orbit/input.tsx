import { cn } from "@/lib/utils";
import { useMemo, useRef, useState } from "react";

/*
 * The visual layer is the crisp design system's generated text-input recipe
 * (src/styles/crisp/text-input.css, generated in the crisp repo from the
 * Attio-measured token sources). This file maps the Orbit Input API onto the
 * generated `.seed-text-input` classes; the border/focus/invalid chrome lives
 * in the recipe (root ::after keyed by data-focus / data-invalid).
 */

// Orbit sm/base → crisp medium (32px); lg → large (36px).
const CRISP_SIZE = { sm: "medium", base: "medium", lg: "large" } as const;

const rootClasses = (size: "sm" | "base" | "lg") =>
  cn(
    "seed-text-input__root seed-text-input__root--variant_outline",
    `seed-text-input__root--variant_outline-size_${CRISP_SIZE[size]}`,
    "cursor-text has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
  );

const valueClasses = (size: "sm" | "base" | "lg") =>
  cn(
    "seed-text-input__value",
    `seed-text-input__value--size_${CRISP_SIZE[size]}`,
    `seed-text-input__value--variant_outline-size_${CRISP_SIZE[size]}`
  );

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  children?: React.ReactNode;
  className?: string;
  displayContent?: "items-first" | "items-last"; // used for children of component
  initialValue?: string;
  isValid?: boolean;
  onValueChange?: ((value: string, isValid: boolean) => void) | undefined;
  preText?: string[] | React.ReactNode[] | React.ReactNode;
  postText?: string[] | React.ReactNode[] | React.ReactNode;
  size?: "sm" | "base" | "lg";
};

export const Input = ({
  className,
  initialValue,
  isValid = true,
  onValueChange,
  preText,
  postText,
  size = "base",
  onFocus,
  onBlur,
  onChange,
  ...props
}: InputProps) => {
  const [currentValue, setCurrentValue] = useState(initialValue ?? "");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useMemo(() => {
    setCurrentValue(initialValue ?? "");
  }, [initialValue]);

  const updateCurrentValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setCurrentValue(newValue);

    if (onValueChange) {
      if (!props.min) {
        onValueChange(newValue, isValid);
      } else if (typeof props.min === "number") {
        onValueChange(newValue.slice(0, props.min), isValid);
      }
    }
    // A caller-supplied onChange must compose with (not replace) the internal
    // state handler, or the controlled value stops updating.
    onChange?.(event);
  };

  return (
    <div
      className={cn(rootClasses(size), className)}
      data-focus={focused || undefined}
      data-invalid={!isValid || undefined}
      data-disabled={props.disabled || undefined}
      onClick={() => inputRef.current?.focus()}
    >
      {preText ? (
        <span
          className={cn(
            // The recipe's slot classes carry the spacing: prefixText gets its
            // margin-left via :first-child, and the value input then relies on
            // the gap. Using the real slot class keeps the sizing generated.
            "seed-text-input__prefixText",
            `seed-text-input__prefixText--variant_outline-size_${CRISP_SIZE[size]}`,
            "pointer-events-none flex shrink-0 select-none items-center [color:var(--content-secondary)]"
          )}
        >
          {preText}
        </span>
      ) : null}

      <input
        className={cn(
          valueClasses(size),
          "w-full min-w-0 bg-transparent focus:outline-none",
          !isValid && "[color:var(--intent-danger)]"
        )}
        onChange={updateCurrentValue}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        ref={inputRef}
        value={currentValue}
        {...props}
      />

      {postText ? (
        <span
          className={cn(
            "seed-text-input__suffixText",
            `seed-text-input__suffixText--variant_outline-size_${CRISP_SIZE[size]}`,
            "flex shrink-0 select-none items-center [color:var(--content-secondary)]"
          )}
        >
          {postText}
        </span>
      ) : null}
    </div>
  );
};
