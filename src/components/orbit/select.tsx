import { cn } from "@/lib/utils";

export type SelectProps = {
  className?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  setValue: (value: string) => void;
  size?: "sm" | "base" | "lg";
  value: string;
};

export const Select = ({
  className,
  options,
  placeholder,
  setValue,
  size = "base",
  value,
}: SelectProps) => {
  return (
    <select
      className={cn(
        "focus-ring interactive relative appearance-none truncate border border-border-default bg-surface-canvas bg-no-repeat rounded-[var(--radius-control)] [color:var(--content-primary)] hover:bg-surface-hover",
        {
          "h-[26px] px-2 text-ui-small !pr-6.5": size === "sm",
          "h-8 px-2.5 text-ui-default !pr-8": size === "base",
          "h-9 px-3 text-ui-default !pr-9": size === "lg",
        },
        {
          "![color:var(--content-tertiary)]": !value,
        },
        className
      )}
      style={{
        backgroundImage: "url(/caret.svg)",
        backgroundPosition: `calc(100% - ${size === "lg" ? "10px" : size === "base" ? "8px" : "6px"}) calc(100% / 2)`,
        backgroundSize:
          size === "lg" ? "16px" : size === "base" ? "14px" : "12px",
      }}
      onChange={(e) => {
        setValue(e.target.value);
        e.target.blur();
      }}
      value={value}
    >
      {placeholder && <option value={""}>{placeholder}</option>}
      {options.map((option, index) => (
        <option value={option.value} key={index}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
