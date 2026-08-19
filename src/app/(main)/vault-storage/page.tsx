"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import NavigationLayout from "../nav-layout";

interface ConfigStatus {
  vaultPath: string;
  configDir: string;
  isRepo: boolean;
  remote: string | null;
}

export default function VaultStoragePage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // The file-backed vault is a self-hosted/desktop concept — in cloud mode
  // connections live in the database, so send cloud users back to their list.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.mode === "cloud") router.replace("/local");
      })
      .catch(() => {});
  }, [router]);

  const refresh = useCallback(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((s: ConfigStatus) => {
        setStatus(s);
        if (s.remote) setUrl(s.remote);
      })
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setMessage("");
      try {
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json();
        setMessage(j.message || j.error || (res.ok ? "Done" : "Failed"));
        refresh();
      } catch {
        setMessage("Something went wrong");
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-2xl p-8">
        <h1 className="mb-1 text-xl font-bold">Vault storage</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Your connections are stored in a single encrypted file. Back it up and
          sync it across devices with any git provider, or a synced folder.
        </p>

        <div className="mb-6 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <div className="mb-1 flex justify-between">
            <span className="text-neutral-500">Vault file</span>
            <span className="font-mono">{status?.vaultPath ?? "…"}</span>
          </div>
          <div className="mb-1 flex justify-between">
            <span className="text-neutral-500">Git-tracked</span>
            <span>{status ? (status.isRepo ? "yes" : "no") : "…"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Remote</span>
            <span className="font-mono">{status?.remote ?? "—"}</span>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium">
          Git repository URL{" "}
          <span className="font-normal text-neutral-500">
            (GitHub, GitLab, Bitbucket, Gitea, self-hosted…)
          </span>
        </label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="git@github.com:you/db-config.git"
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            disabled={busy || !url}
            onClick={() => post({ action: "link", url })}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-blue-500 disabled:opacity-50 dark:border-neutral-700"
          >
            Connect
          </button>
        </div>

        <button
          disabled={busy || !status?.remote}
          onClick={() => post({ action: "sync" })}
          className="mt-4 rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00] disabled:opacity-50"
        >
          {busy ? "Working…" : "Sync now (pull + push)"}
        </button>

        {message && (
          <p className="mt-4 rounded-lg bg-neutral-100 p-3 font-mono text-xs dark:bg-neutral-900">
            {message}
          </p>
        )}

        <div className="mt-8 rounded-lg border border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          <p className="mb-1 font-medium text-neutral-800 dark:text-neutral-200">
            Prefer a cloud drive?
          </p>
          <p>
            The vault is just a file. Put the config folder inside a folder synced
            by Google Drive, OneDrive, Dropbox, or iCloud and it syncs
            automatically — set <span className="font-mono">PMSQL_VAULT</span> to a
            path inside that folder.
          </p>
        </div>
      </div>
    </NavigationLayout>
  );
}
