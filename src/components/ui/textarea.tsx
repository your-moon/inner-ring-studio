import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // crisp text-input look for multiline: hairline inset ring at rest,
          // 2px neutral-contrast ring on focus (a textarea cannot carry the
          // recipe's ::after layer, so the rings live on box-shadow directly).
          "flex min-h-[60px] w-full rounded-[var(--seed-radius-r2)] border-0 bg-[var(--seed-color-bg-layer-default)] px-2.5 py-2 text-[14px] [color:var(--seed-color-fg-neutral)]",
          "shadow-[inset_0_0_0_1px_var(--seed-color-stroke-neutral-weak)] outline-none placeholder:[color:var(--content-tertiary)]",
          "focus-visible:shadow-[inset_0_0_0_2px_var(--seed-color-stroke-neutral-contrast)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
