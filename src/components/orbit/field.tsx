"use client";

import {
  createContext,
  useContext,
  useId,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * The Field system ties a label, help text, and validation message to one
 * control with correct semantics: the label points at the control, help and
 * error are wired through aria-describedby, and an invalid control announces
 * aria-invalid. Controls read this via useFieldControl().
 */
type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** Props a control spreads onto itself to join the surrounding Field. */
export function useFieldControl() {
  const ctx = useContext(FieldContext);
  if (!ctx) return {} as Record<string, never>;
  return {
    id: ctx.id,
    "aria-describedby": ctx.describedBy,
    "aria-invalid": ctx.invalid || undefined,
    "aria-required": ctx.required || undefined,
  };
}

export type FieldProps = {
  children: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
};

/** The ergonomic composite: label + control + description/error, fully wired. */
export function Field({
  children,
  label,
  description,
  error,
  required = false,
  className,
}: FieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const invalid = Boolean(error);
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid, required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label ? (
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
        ) : null}
        {children}
        {description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null}
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      </div>
    </FieldContext.Provider>
  );
}

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function FieldLabel({
  children,
  className,
  required = false,
  ...props
}: FieldLabelProps) {
  return (
    <label
      className={cn(
        "text-ui-small [color:var(--content-secondary)] font-[var(--weight-medium)]",
        className
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="[color:var(--intent-danger)]" aria-hidden>
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}

export type FieldTextProps = HTMLAttributes<HTMLParagraphElement>;

export function FieldDescription({
  children,
  className,
  ...props
}: FieldTextProps) {
  return (
    <p
      className={cn(
        "text-ui-caption [color:var(--content-tertiary)]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function FieldError({ children, className, ...props }: FieldTextProps) {
  return (
    <p
      role="alert"
      className={cn(
        "text-ui-caption [color:var(--intent-danger)]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
