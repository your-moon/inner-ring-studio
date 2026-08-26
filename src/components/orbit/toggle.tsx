import { cn } from "@/lib/utils";

type ToggleProps = {
  size?: "sm" | "base" | "lg";
  toggled?: boolean;
  onChange?: (value: boolean) => void;
};

export const Toggle = ({ onChange, size = "base", toggled }: ToggleProps) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!toggled}
      className={cn(
        // crisp tokens: neutral track at rest, brand fill when on.
        "focus-ring cursor-pointer rounded-full border border-transparent bg-[var(--seed-color-palette-gray-300)] p-1 transition-colors",
        {
          "h-5.5 w-8.5": size === "sm",
          "h-6.5 w-10.5": size === "base",
          "h-7.5 w-12.5": size === "lg",
          "bg-[var(--seed-color-bg-brand-solid)]": toggled,
        }
      )}
      onClick={() => {
        if (onChange) onChange(!toggled);
      }}
    >
      <div
        className={cn(
          "aspect-square h-full rounded-full [background:var(--primary-foreground)] transition-all",
          {
            "translate-x-full": toggled,
          }
        )}
      />
    </button>
  );
};
