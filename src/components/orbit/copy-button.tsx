"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, type ButtonProps } from "./button";

const CONFIRMATION_MS = 1200;

export type CopyButtonProps = Omit<
  ButtonProps,
  "children" | "loading" | "loadingLabel" | "onClick" | "title"
> & {
  /** The text placed on the clipboard. */
  value: string;
  /** Visible label at rest; omit for an icon-only control. */
  label?: string;
  copiedLabel?: string;
  onCopied?: (value: string) => void;
};

/**
 * Copy with transient confirmation. The label and icon swap for ~1.2s and
 * the result is announced, so success is legible without a toast.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  onCopied,
  shape,
  variant = "secondary",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconOnly = shape === "square";

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    onCopied?.(value);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
  }, [onCopied, value]);

  return (
    <Button
      {...props}
      aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
      displayContent="items-first"
      onClick={copy}
      shape={shape}
      title={iconOnly ? undefined : copied ? copiedLabel : label}
      variant={variant}
    >
      {copied ? <Check weight="bold" /> : <Copy />}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </Button>
  );
}
