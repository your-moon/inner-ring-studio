import { cn } from "@/lib/utils";
import { useMemo, useRef, useState } from "react";

export const inputClasses = cn(
  "bg-surface-canvas [color:var(--content-primary)] border-border-default focus:border-[var(--border-focus)] placeholder:[color:var(--content-tertiary)] disabled:cursor-not-allowed disabled:opacity-50 border transition-colors focus:outline-none"
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
  ...props
}: InputProps) => {
  const [currentValue, setCurrentValue] = useState(initialValue ?? "");
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
  };

  const handlePreTextInputClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return preText ? (
    <div
      className={cn(
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:enabled]:active:border-[var(--border-focus)] has-[:focus]:border-[var(--border-focus)] flex cursor-text",
        inputClasses,
        {
          "h-[26px] px-2 rounded-[var(--radius-control)] text-ui-small": size === "sm",
          "h-8 px-2.5 rounded-[var(--radius-control)] text-ui-default": size === "base",
          "h-9 px-3 rounded-[var(--radius-control)] text-ui-default": size === "lg",
        },
        className
      )}
      onClick={handlePreTextInputClick}
    >
      <span className="[color:var(--content-secondary)] pointer-events-none mr-0.5 flex items-center gap-2 transition-colors select-none">
        {preText}
      </span>

      <input
        className={cn(
          "placeholder:[color:var(--content-tertiary)] w-full bg-transparent focus:outline-none",
          {
            "[color:var(--intent-danger)]": !isValid,
          }
        )}
        onChange={updateCurrentValue}
        ref={inputRef}
        value={currentValue}
        {...props}
      />

      <span className="[color:var(--content-secondary)] mr-0.5 flex items-center gap-2 transition-colors select-none">
        {postText}
      </span>
    </div>
  ) : (
    <input
      className={cn(
        inputClasses,
        {
          "[color:var(--intent-danger)] transition-colors": !isValid,
          "h-[26px] px-2 rounded-[var(--radius-control)] text-ui-small": size === "sm",
          "h-8 px-2.5 rounded-[var(--radius-control)] text-ui-default": size === "base",
          "h-9 px-3 rounded-[var(--radius-control)] text-ui-default": size === "lg",
        },
        className
      )}
      onChange={updateCurrentValue}
      value={currentValue}
      {...props}
    />
  );
};
