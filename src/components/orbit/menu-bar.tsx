import { cn } from "@/lib/utils";

export interface MenuBarItemProps {
  aria?: string;
  content: string | React.ReactNode;
  value: string;
}

const MenuItem = ({
  value: { content, aria },
  selected,
  onClick,
}: {
  value: MenuBarItemProps;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    aria-label={typeof content === "string" ? content : aria}
    className={cn(
      "focus-ring block h-full cursor-pointer rounded-[var(--radius-small)] border border-transparent px-2 transition-colors [color:var(--content-secondary)] hover:[color:var(--content-primary)]",
      {
        "bg-surface-hover border-border-default [color:var(--content-primary)]":
          selected,
      }
    )}
    onClick={onClick}
  >
    {content}
  </button>
);

interface MenuBarProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  items: MenuBarItemProps[];
  size?: "sm" | "base" | "lg";
}

export function MenuBar({
  value,
  onChange,
  className,
  items,
  size = "base",
}: MenuBarProps) {
  return (
    <nav
      className={cn(
        "bg-surface-panel border-border-default flex w-max rounded-[var(--radius-menu)] border !p-0.5 transition-colors",
        {
          "h-[26px] text-ui-small": size === "sm",
          "h-8 text-ui-default": size === "base",
          "h-9 text-ui-default": size === "lg",
        },
        className
      )}
    >
      {items.map((item) => (
        <MenuItem
          key={item.value}
          value={item}
          selected={value === item.value}
          onClick={() => {
            if (onChange) onChange(item.value);
          }}
        />
      ))}
    </nav>
  );
}
