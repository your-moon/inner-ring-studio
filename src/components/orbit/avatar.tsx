import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type AvatarProps = {
  as?: React.ElementType;
  image?: string;
  size?: "sm" | "base" | "lg";
  toggled?: boolean;
  username: string;
};

export const Avatar = ({
  as = "button",
  image,
  size = "base",
  toggled,
  username,
}: AvatarProps) => {
  const Component = as && (as === "link" ? Link : as);

  const firstInitial = username.charAt(0).toUpperCase();

  return (
    <Component
      className={cn(
        "bg-surface-canvas border-border-default relative overflow-hidden border [color:var(--content-primary)]",
        {
          "size-[26px] place-items-center rounded-full grid": size === "sm",
          "size-8 place-items-center rounded-full grid": size === "base",
          "size-9 place-items-center rounded-full grid": size === "lg",
          "hover:bg-surface-hover": as === "button",
          "after:absolute after:top-0 after:left-0 after:z-10 after:size-full after:bg-black/5 after:opacity-0 after:transition-opacity hover:after:opacity-100 dark:after:bg-white/10":
            image,
          "after:opacity-100": image && toggled,
          "bg-surface-hover": !image && toggled,
        }
      )}
    >
      {image ? (
        <Image
          className="w-full"
          height={size === "sm" ? 28 : size === "base" ? 32 : 36}
          width={size === "sm" ? 28 : size === "base" ? 32 : 36}
          src={image}
          alt={username}
        />
      ) : (
        <p className="font-[var(--weight-semibold)] leading-none [color:var(--content-tertiary)]">
          {firstInitial}
        </p>
      )}
    </Component>
  );
};
