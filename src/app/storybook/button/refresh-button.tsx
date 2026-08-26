import { Button, ButtonProps } from "@/components/orbit/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export const RefreshButton = ({ ...props }: ButtonProps) => (
  <Button shape="square" toggled={props.toggled} {...props}>
    <RefreshCw
      className={cn({
        "animate-refresh": props.toggled,
        "size-4.5": props.size === "base",
        "size-4": props.size === "sm",
        "size-5": props.size === "lg",
      })}
    />
  </Button>
);
