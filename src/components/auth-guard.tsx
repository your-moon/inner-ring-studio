"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side redirect to /login when auth is enabled and the session is
 * missing/expired. This is UX only — the real enforcement is server-side in the
 * API routes (requireAuth). Renders children immediately; pages carry no data
 * without an authorized API call.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/login") return;
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.authEnabled && !j.authed) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
