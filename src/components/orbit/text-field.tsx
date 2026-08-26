"use client";

import { Eye, EyeOff, Minus, Plus, Search } from "lucide-react";
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

import { useFieldControl } from "./field";
import IconButton from "./icon-button";

const FIELD_SIZES = {
  sm: "h-7 text-ui-small [line-height:var(--type-ui-small-line-height)]",
  base: "h-8 text-ui-default [line-height:var(--type-ui-default-line-height)]",
  lg: "h-9 text-ui-default [line-height:var(--type-ui-default-line-height)]",
} as const;

export type FieldSize = keyof typeof FIELD_SIZES;

/** Shared shell for text-entry controls: border, fill, focus, invalid state. */
const fieldShell = (invalid: boolean) =>
  cn(
    "focus-ring w-full rounded-[var(--radius-control)] border bg-surface-canvas",
    "[color:var(--content-primary)] placeholder:[color:var(--content-tertiary)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    invalid ? "border-intent-danger" : "border-border-default focus:border-border-focus"
  );

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  size?: FieldSize;
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

/** The base single-line text input. Presets below build on it. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { className, size = "base", invalid = false, leading, trailing, ...props },
    ref
  ) {
    const field = useFieldControl();
    const merged = { ...field, ...props };
    const isInvalid = invalid || merged["aria-invalid"] === true;
    const { onFocus, onBlur, ...inputProps } = merged;
    const [focused, setFocused] = useState(false);

    // crisp text-input recipe: Orbit sm/base → medium (32px), lg → large (36px).
    const crispSize = size === "lg" ? "large" : "medium";

    return (
      <div
        className={cn(
          "seed-text-input__root seed-text-input__root--variant_outline",
          `seed-text-input__root--variant_outline-size_${crispSize}`,
          "w-full cursor-text has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
          className
        )}
        data-focus={focused || undefined}
        data-invalid={isInvalid || undefined}
        data-disabled={merged.disabled || undefined}
      >
        {leading ? (
          <span
            className={cn(
              "seed-text-input__prefixText",
              `seed-text-input__prefixText--variant_outline-size_${crispSize}`,
              "flex shrink-0 items-center [color:var(--content-tertiary)] [&_svg]:size-[var(--icon-sm)]"
            )}
          >
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            "seed-text-input__value",
            `seed-text-input__value--size_${crispSize}`,
            `seed-text-input__value--variant_outline-size_${crispSize}`,
            "w-full min-w-0 flex-1 bg-transparent outline-none placeholder:[color:var(--content-tertiary)]"
          )}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {trailing ? (
          <span
            className={cn(
              "seed-text-input__suffixText",
              `seed-text-input__suffixText--variant_outline-size_${crispSize}`,
              "flex shrink-0 items-center [color:var(--content-tertiary)] [&_svg]:size-[var(--icon-sm)]"
            )}
          >
            {trailing}
          </span>
        ) : null}
      </div>
    );
  }
);

/** Text input primed for search — a leading glyph and search semantics. */
export const SearchField = forwardRef<HTMLInputElement, TextFieldProps>(
  function SearchField({ leading, type = "search", placeholder = "Search", ...props }, ref) {
    return (
      <TextField
        ref={ref}
        type={type}
        placeholder={placeholder}
        leading={leading ?? <Search />}
        {...props}
      />
    );
  }
);

/** Password input with an accessible show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, TextFieldProps>(
  function PasswordField({ size = "base", ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <TextField
        ref={ref}
        size={size}
        type={visible ? "text" : "password"}
        trailing={
          <IconButton
            type="button"
            size="sm"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className="-mr-1"
          >
            {visible ? <EyeOff /> : <Eye />}
          </IconButton>
        }
        {...props}
      />
    );
  }
);

export type NumberFieldProps = Omit<TextFieldProps, "type"> & {
  step?: number;
};

/** Number input with stepper controls that respect min/max/step. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField({ step = 1, size = "base", ...props }, ref) {
    const nudge = (dir: 1 | -1) => (event: { currentTarget: HTMLElement }) => {
      const input = event.currentTarget
        .closest("[data-number-field]")
        ?.querySelector("input");
      if (input instanceof HTMLInputElement) {
        input[dir === 1 ? "stepUp" : "stepDown"]();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    return (
      <div data-number-field className="contents">
        <TextField
          ref={ref}
          size={size}
          type="number"
          inputMode="decimal"
          step={step}
          className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          trailing={
            <span className="-mr-1 flex items-center">
              <IconButton
                type="button"
                size="sm"
                aria-label="Decrease"
                onClick={nudge(-1)}
              >
                <Minus />
              </IconButton>
              <IconButton
                type="button"
                size="sm"
                aria-label="Increase"
                onClick={nudge(1)}
              >
                <Plus />
              </IconButton>
            </span>
          }
          {...props}
        />
      </div>
    );
  }
);

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

/** Multi-line text entry sharing the text-input shell. */
export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(function TextareaField({ className, invalid = false, ...props }, ref) {
  const field = useFieldControl();
  const merged = { ...field, ...props };
  const isInvalid = invalid || merged["aria-invalid"] === true;
  return (
    <textarea
      ref={ref}
      className={cn(
        fieldShell(isInvalid),
        "text-ui-default [line-height:var(--type-ui-default-line-height)] min-h-[72px] resize-y px-2.5 py-2",
        className
      )}
      {...merged}
    />
  );
});

/** Native date input, sharing the text-field shell. */
export const DateField = forwardRef<HTMLInputElement, TextFieldProps>(
  function DateField(props, ref) {
    return <TextField ref={ref} type="date" {...props} />;
  }
);

/** Native time input, sharing the text-field shell. */
export const TimeField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TimeField(props, ref) {
    return <TextField ref={ref} type="time" {...props} />;
  }
);
