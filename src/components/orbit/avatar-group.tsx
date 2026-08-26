import { cn } from "@/lib/utils";

export type AvatarGroupPerson = { name: string; image?: string };

export type AvatarGroupProps = {
  people: AvatarGroupPerson[];
  max?: number;
  size?: "sm" | "base";
  className?: string;
};

const SIZES = {
  sm: "size-5 text-[9px] leading-none",
  base: "size-6 text-[10px] leading-none",
} as const;

/** Overlapping avatars (assignees, members) with a +N overflow, Linear-style. */
export function AvatarGroup({
  people,
  max = 4,
  size = "base",
  className,
}: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {shown.map((p, i) => (
        <span
          key={`${p.name}-${i}`}
          title={p.name}
          className={cn(
            "border-surface-panel bg-surface-hover [color:var(--content-secondary)] grid place-items-center overflow-hidden rounded-full border-2 font-[var(--weight-semibold)] leading-none",
            SIZES[size]
          )}
        >
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} className="size-full object-cover" />
          ) : (
            p.name.charAt(0).toUpperCase()
          )}
        </span>
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            "border-surface-panel bg-surface-hover [color:var(--content-tertiary)] grid place-items-center rounded-full border-2 font-[var(--weight-medium)] leading-none",
            SIZES[size]
          )}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
