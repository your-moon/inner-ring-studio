import { buttonVariants } from "../ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ListButtonItem({
  selected,
  text,
  icon: LucideIcon,
  onClick,
}: Readonly<{
  selected?: boolean;
  text: string;
  icon?: LucideIcon;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        buttonVariants({
          variant: selected ? "default" : "ghost",
          size: "sm",
        }),
        "justify-start",
        "cursor-pointer"
      )}
    >
      {LucideIcon ? (
        <LucideIcon className="w-4 h-4 mr-2" />
      ) : (
        <div className="w-4 h-4 mr-2"></div>
      )}
      {text}
    </button>
  );
}
