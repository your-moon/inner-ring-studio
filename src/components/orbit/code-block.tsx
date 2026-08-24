import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CopyButton } from "./copy-button";

/**
 * Multi-line code with an optional caption bar and copy control. For a single
 * inline token use Code instead.
 */
export type CodeBlockProps = {
  code: string;
  caption?: ReactNode;
  showLineNumbers?: boolean;
  copyable?: boolean;
  className?: string;
};

export function CodeBlock({
  code,
  caption,
  showLineNumbers = false,
  copyable = true,
  className,
}: CodeBlockProps) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div
      className={cn(
        "border-border-default bg-surface-canvas overflow-hidden rounded-[var(--radius-panel)] border",
        className
      )}
    >
      {caption || copyable ? (
        <div className="border-border-subtle bg-surface-panel flex h-9 items-center justify-between border-b px-3">
          <span className="text-ui-caption [color:var(--content-tertiary)] font-mono">
            {caption}
          </span>
          {copyable ? (
            <CopyButton value={code} label="Copy" size="sm" variant="ghost" />
          ) : null}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-3 text-ui-small leading-[1.6]">
        <code className="font-mono">
          {showLineNumbers
            ? lines.map((line, i) => (
                <span key={i} className="grid grid-cols-[2ch_1fr] gap-3">
                  <span className="[color:var(--content-disabled)] text-right select-none">
                    {i + 1}
                  </span>
                  <span className="[color:var(--content-secondary)] whitespace-pre">
                    {line || " "}
                  </span>
                </span>
              ))
            : (
                <span className="[color:var(--content-secondary)] whitespace-pre">
                  {code.replace(/\n$/, "")}
                </span>
              )}
        </code>
      </pre>
    </div>
  );
}
