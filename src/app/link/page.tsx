"use client";

import AuthShell, { authButton } from "@/components/auth-shell";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function LinkPage() {
  return (
    <Suspense>
      <LinkConsent />
    </Suspense>
  );
}

// Browser-side consent screen for linking a desktop app to this cloud account.
// The desktop opens this in the system browser with ?cb=<its own loopback URL>.
// Once the user is signed in and confirms, we mint a one-time code and redirect
// back to the desktop's loopback callback.
function LinkConsent() {
  const router = useRouter();
  const params = useSearchParams();
  const cb = params.get("cb") || "";
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "connecting" | "done" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  const validCb =
    /^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(cb);

  useEffect(() => {
    if (!validCb) {
      setError("This link is missing a valid desktop callback.");
      setState("error");
      return;
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!j.authed) {
          router.replace(`/login?next=${encodeURIComponent(`/link?cb=${cb}`)}`);
          return;
        }
        setEmail(j.email ?? null);
        setState("ready");
      })
      .catch(() => {
        setError("Couldn't reach the cloud. Try again.");
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setState("connecting");
    setError("");
    try {
      const res = await fetch("/api/auth/link/create", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.code) {
        setError(j.error || "Couldn't create a link.");
        setState("error");
        return;
      }
      setState("done");
      const sep = cb.includes("?") ? "&" : "?";
      window.location.href = `${cb}${sep}code=${encodeURIComponent(j.code)}`;
    } catch {
      setError("Something went wrong.");
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <AuthShell title="Connect desktop" subtitle="Checking your session…">
        <div />
      </AuthShell>
    );
  }

  if (state === "error") {
    return (
      <AuthShell title="Connect desktop" subtitle="We hit a snag.">
        <p className="text-sm text-red-600">{error}</p>
      </AuthShell>
    );
  }

  if (state === "done") {
    return (
      <AuthShell
        title="Connected"
        subtitle="You're linked. Head back to Inner Ring Studio, you can close this tab."
      >
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Connect desktop"
      subtitle="Link the Inner Ring Studio desktop app to your cloud account."
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="text-neutral-500">Signed in as</div>
          <div className="font-medium">{email}</div>
        </div>
        <p className="text-sm text-neutral-500">
          The desktop app will be able to read and write your cloud boards,
          schedules, comments and shared workspaces. Your database credentials
          stay on your machine, they are never sent to the cloud.
        </p>
        <button
          onClick={connect}
          disabled={state === "connecting"}
          className={authButton}
        >
          {state === "connecting" ? "Connecting…" : "Connect desktop"}
        </button>
      </div>
    </AuthShell>
  );
}
