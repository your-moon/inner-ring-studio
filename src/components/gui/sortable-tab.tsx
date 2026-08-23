import { CSS } from "@/lib/dnd-kit";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { LucideIcon, LucideX } from "lucide-react";
import { forwardRef } from "react";
import { ButtonProps } from "../ui/button";
import { WindowTabItemProps } from "./windows-tab";

interface SortableTabProps {
  tab: WindowTabItemProps;
  selected: boolean;
  index: number;
  tabCount: number;
  onSelectChange: () => void;
  onClose?: () => void;
}

type WindowTabItemButtonProps = ButtonProps & {
  selected?: boolean;
  title: string;
  icon: LucideIcon;
  onClose?: () => void;
  isDragging?: boolean;
  index: number;
};

export const WindowTabItemButton = forwardRef<
  HTMLButtonElement,
  WindowTabItemButtonProps
>(function WindowTabItemButton(props: WindowTabItemButtonProps, ref) {
  const {
    icon: Icon,
    selected,
    title,
    onClose,
    isDragging,
    index,
    ...rest
  } = props;

  return (
    <button
      className={cn(
        // Quiet tabs on the canvas plane; the active tab joins the content
        // sheet (bg + open bottom edge) instead of shouting with color.
        "relative flex h-[40px] max-w-[280px] min-w-[150px] items-center border-x px-2 text-left text-[13px]",
        "u-smooth bg-transparent text-muted-foreground hover:text-foreground",
        isDragging && "z-20",
        selected
          ? "border-border/60 bg-background font-medium text-foreground"
          : "border-x-transparent border-b border-border/60",
        index === 0 ? "border-l-0" : ""
      )}
      onAuxClick={({ button }) => button === 1 && onClose && onClose()}
      ref={ref}
      {...rest}
    >
      <Icon className="ml-2 h-4 w-4 shrink-0 grow-0" />
      <div className="line-clamp-1 grow px-2">{title}</div>
      {onClose && (
        <div
          className={cn(
            "ml-2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (onClose) onClose();
          }}
        >
          <LucideX className={cn("h-3 w-3 shrink-0 grow-0")} />
        </div>
      )}

      {!selected && (
        <div className="absolute top-3 right-[-1px] h-4 w-[1px] bg-border/70" />
      )}
    </button>
  );
});

export function SortableTab({
  index,
  tab,
  selected,
  onSelectChange,
  onClose,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    transition,
    transform,
    isDragging,
    setNodeRef,
  } = useSortable({ id: tab.key });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <WindowTabItemButton
      ref={setNodeRef}
      icon={tab.icon}
      title={tab.title}
      onClick={onSelectChange}
      selected={selected}
      onClose={onClose}
      style={style}
      index={index}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
    />
  );
}
