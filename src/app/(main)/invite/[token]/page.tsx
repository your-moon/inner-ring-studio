"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InviteInfo {
  workspaceName: string;
  email: string;
  role: string;
  accepted: boolean;
  matches: boolean;
  myEmail: string | null;
  error?: string;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ error: "Could not load invite." } as InviteInfo));
  }, [token]);

  async function accept() {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/invite/${token}`, { method: "POST" }).then((x) => x.json());
    if (r.ok) {
      await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: r.workspaceId }),
      });
      window.location.href = "/local";
    } else {
      setBusy(false);
      setError(r.error || "Could not accept the invite.");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace(`/login?next=/invite/${token}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-neutral-800 dark:border-neutral-200">
          <div className="h-3.5 w-3.5 rounded-full bg-neutral-800 dark:bg-neutral-200" />
        </div>

        {!info && <p className="text-sm text-neutral-500">Loading invite…</p>}

        {info?.error && <p className="text-sm text-red-600">{info.error}</p>}

        {info && !info.error && (
          <>
            <h1 className="text-xl font-bold">
              Join <span className="text-[#a07a00] dark:text-[#FFEB02]">{info.workspaceName}</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              You&apos;ve been invited as <span className="font-medium capitalize">{info.role}</span>.
            </p>

            {info.matches ? (
              <>
                <button
                  onClick={accept}
                  disabled={busy}
                  className="mt-6 w-full rounded-lg bg-[#FFEB02] py-2.5 text-sm font-semibold text-black hover:bg-[#f2df00] disabled:opacity-50"
                >
                  {busy ? "Joining…" : `Join as ${info.role}`}
                </button>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              </>
            ) : (
              <div className="mt-6 rounded-lg bg-neutral-50 p-4 text-sm dark:bg-neutral-800/50">
                <p className="text-neutral-600 dark:text-neutral-300">
                  This invite is for <span className="font-medium">{info.email}</span>, but
                  you&apos;re signed in as <span className="font-medium">{info.myEmail}</span>.
                </p>
                <button
                  onClick={signOut}
                  className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700"
                >
                  Sign in as {info.email}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
