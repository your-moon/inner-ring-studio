"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Vault } from "lucide-react";
import NavigationLayout from "../nav-layout";

interface ConfigStatus {
  vaultPath: string;
  configDir: string;
  isRepo: boolean;
  remote: string | null;
}

interface VaultRow {
  id: string;
  name: string;
  dir: string;
  repoUrl?: string;
  active: boolean;
}

export default function VaultStoragePage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Vaults on this machine (the registry) + the "add vault" form. Multi-vault is
  // disabled when the vault is pinned via PMSQL_VAULT (e.g. the self-hosted
  // server) — then only the active-vault git storage below applies.
  const [mvEnabled, setMvEnabled] = useState(false);
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<"create" | "link">("create");
  const [newUrl, setNewUrl] = useState("");

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
    fetch("/api/vaults")
      .then((r) => r.json())
      .then((j: { enabled?: boolean; vaults?: VaultRow[] }) => {
        setMvEnabled(j.enabled !== false);
        setVaults(j.vaults ?? []);
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

  const vaultPost = useCallback(
    async (body: Record<string, unknown>, reloadOnOk = false) => {
      setBusy(true);
      setMessage("");
      try {
        const res = await fetch("/api/vaults", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json();
        if (res.ok && reloadOnOk) {
          // Switched the active vault — reload so every vault-scoped fetch re-runs.
          window.location.reload();
          return;
        }
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

  const addVault = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    await vaultPost({
      action: "add",
      name,
      mode: newMode,
      url: newMode === "link" ? newUrl.trim() : undefined,
    });
    setNewName("");
    setNewUrl("");
    setNewMode("create");
  }, [newName, newMode, newUrl, vaultPost]);

  const forget = useCallback(
    (v: VaultRow) => {
      if (
        !window.confirm(
          `Remove "${v.name}" from this machine's vault list?\n\n` +
            `Its encrypted files stay on disk at:\n${v.dir}`
        )
      )
        return;
      vaultPost({ action: "remove", id: v.id });
    },
    [vaultPost]
  );

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-2xl p-8">
        <h1 className="mb-1 text-xl font-bold">
          {mvEnabled ? "Vaults" : "Vault storage"}
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          {mvEnabled
            ? "Each vault is a separate encrypted store of connections on this machine. Switch between them, and back each one up by linking it to a git repo."
            : "Your connections are stored in a single encrypted file. Back it up and sync it across devices with any git provider, or a synced folder."}
        </p>

        {mvEnabled && (
          <>
        {/* ---- Vaults on this machine ---- */}
        <div className="mb-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          {vaults.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0 dark:border-neutral-800/60"
            >
              <Vault size={16} className="shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{v.name}</span>
                  {v.active && (
                    <span className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Check size={10} /> active
                    </span>
                  )}
                  {v.repoUrl && (
                    <span className="text-[10px] text-neutral-400">synced</span>
                  )}
                </div>
                <div className="truncate font-mono text-xs text-neutral-400">
                  {v.repoUrl ?? v.dir}
                </div>
              </div>
              {!v.active && (
                <button
                  disabled={busy}
                  onClick={() => vaultPost({ action: "switch", id: v.id }, true)}
                  className="shrink-0 rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700"
                >
                  Switch
                </button>
              )}
              {!v.active && vaults.length > 1 && (
                <button
                  disabled={busy}
                  onClick={() => forget(v)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
                  title="Remove from the list (keeps files on disk)"
                >
                  Forget
                </button>
              )}
            </div>
          ))}
          {vaults.length === 0 && (
            <div className="px-4 py-3 text-xs text-neutral-400">Loading…</div>
          )}
        </div>

        {/* ---- Add a vault ---- */}
        <div className="mb-8 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-3 text-sm font-medium">Add a vault</div>
          <div className="mb-3 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Team, Client X)"
              className="flex-1 rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
            />
            <div className="flex overflow-hidden rounded-lg border border-input text-sm dark:border-neutral-700">
              {(["create", "link"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setNewMode(m)}
                  className={
                    "px-3 py-2 " +
                    (newMode === m
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800")
                  }
                >
                  {m === "create" ? "New" : "Link repo"}
                </button>
              ))}
            </div>
          </div>
          {newMode === "link" && (
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="git@github.com:you/db-config.git"
              className="mb-3 w-full rounded-lg border border-input bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
            />
          )}
          <button
            disabled={busy || !newName.trim() || (newMode === "link" && !newUrl.trim())}
            onClick={addVault}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:border-blue-500 disabled:opacity-50 dark:border-neutral-700"
          >
            {newMode === "link" ? "Clone & add" : "Create vault"}
          </button>
          <p className="mt-2 text-xs text-neutral-400">
            All vaults on this machine share the same passphrase. Linking clones an
            existing vault repo; it only opens if it used that passphrase.
          </p>
        </div>
          </>
        )}

        {/* ---- Git storage for the ACTIVE vault ---- */}
        {mvEnabled && (
          <>
            <h2 className="mb-1 text-sm font-bold">Active vault storage</h2>
            <p className="mb-4 text-sm text-neutral-500">
              Back up the active vault and sync it across devices with any git
              provider, or a synced folder.
            </p>
          </>
        )}

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
            className="flex-1 rounded-lg border border-input bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            disabled={busy || !url}
            onClick={() => post({ action: "link", url })}
            className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:border-blue-500 disabled:opacity-50 dark:border-neutral-700"
          >
            Connect
          </button>
        </div>

        <button
          disabled={busy || !status?.remote}
          onClick={() => post({ action: "sync" })}
          className="mt-4 rounded-lg press bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50"
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
