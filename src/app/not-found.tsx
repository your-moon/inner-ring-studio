import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-neutral-950">
      <div className="flex items-center gap-4">
        <span className="text-4xl font-semibold text-neutral-900 dark:text-white">
          404
        </span>
        <span className="h-8 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className="text-neutral-500">This page could not be found.</span>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-[#FFEB02] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#f2df00]"
      >
        Back to your connections
      </Link>
    </div>
  );
}
