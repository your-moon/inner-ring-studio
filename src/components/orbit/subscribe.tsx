"use client";

import { Bell, BellOff } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The issue subscribe control. Ground-truthed on linear.app: a 32px-tall pill
 * (radius-full) that reads "Subscribe" / "Unsubscribe" and flips the bell.
 */

export type SubscribeToggleProps = {
  subscribed: boolean;
  onToggle: () => void;
  className?: string;
};

/** A pill that toggles issue subscription. */
export function SubscribeToggle({
  subscribed,
  onToggle,
  className,
}: SubscribeToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={subscribed}
      aria-label={subscribed ? "Unsubscribe from issue" : "Subscribe to issue"}
      onClick={onToggle}
      className={cn(
        "focus-ring text-ui-small inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-full)] border px-3 whitespace-nowrap transition-colors [&_svg]:size-[var(--icon-sm)]",
        subscribed
          ? "border-border-default bg-surface-raised [color:var(--content-secondary)] hover:border-border-strong hover:[color:var(--content-primary)]"
          : "border-transparent [color:var(--content-tertiary)] hover:bg-surface-hover hover:[color:var(--content-primary)]",
        className
      )}
    >
      {subscribed ? <Bell fill="currentColor" /> : <BellOff />}
      {subscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}
