"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavigationLayout from "../nav-layout";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ mode: string; email: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ mode: "selfhosted", email: null }));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  const isCloud = me?.mode === "cloud";

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-lg p-8">
        <h1 className="mb-6 text-xl font-bold">Account</h1>

        <div className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Signed in as
          </div>
          <div className="mt-1 font-medium">
            {isCloud ? me?.email ?? "…" : "Self-hosted (single password)"}
          </div>
          <button
            onClick={signOut}
            className="mt-3 seed-action-button seed-action-button--variant_neutralOutline seed-action-button--size_small seed-action-button--layout_withText seed-action-button--size_small-layout_withText disabled:opacity-50"
          >
            Sign out
          </button>
        </div>

        {isCloud && (
          <>
            <ChangePassword />
            <DeleteAccount onDeleted={() => router.replace("/login")} />
          </>
        )}
      </div>
    </NavigationLayout>
  );
}

const input =
  "w-full h-8 w-full rounded-[var(--seed-radius-r2)] border-0 bg-[var(--seed-color-bg-layer-default)] px-2.5 text-[14px] [color:var(--seed-color-fg-neutral)] shadow-[inset_0_0_0_1px_var(--seed-color-stroke-neutral-weak)] outline-none placeholder:[color:var(--content-tertiary)] focus:shadow-[inset_0_0_0_2px_var(--seed-color-stroke-neutral-contrast)]";

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Password updated." });
      setCurrent("");
      setNext("");
    } else {
      setMsg({ ok: false, text: j.error || "Could not update password." });
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 font-medium">Change password</div>
      <div className="space-y-3">
        <input
          type="password"
          className={input}
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          type="password"
          className={input}
          placeholder="New password (min 8)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        {msg && (
          <p className={"text-sm " + (msg.ok ? "text-green-600" : "text-red-600")}>
            {msg.text}
          </p>
        )}
        <button
          onClick={submit}
          disabled={busy || !current || next.length < 8}
          className="seed-action-button seed-action-button--variant_brandSolid seed-action-button--size_medium seed-action-button--layout_withText seed-action-button--size_medium-layout_withText disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </div>
    </div>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) onDeleted();
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not delete account.");
    }
  }

  return (
    <div className="rounded-xl border border-red-200 p-4 dark:border-red-900/50">
      <div className="mb-1 font-medium text-red-700 dark:text-red-400">
        Delete account
      </div>
      <p className="mb-3 text-sm text-neutral-500">
        Permanently deletes your account and all your saved connections. This
        cannot be undone.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="password"
            className={input}
            placeholder="Enter your password to confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={del}
              disabled={busy || !password}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-4 py-2 text-sm text-neutral-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
