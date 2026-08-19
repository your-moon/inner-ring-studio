"use client";

import { Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import NavigationLayout from "../nav-layout";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface Me {
  mode: string;
  userId: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  workspacePersonal: boolean;
  role: string | null;
}
interface Member {
  userId: string;
  email: string;
  role: "owner" | "editor" | "viewer";
}

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#e0cf00] dark:border-neutral-700 dark:bg-neutral-950";
const yellowBtn =
  "rounded-lg bg-[#FFEB02] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f2df00] disabled:opacity-50";

export default function WorkspacePage() {
  const router = useRouter();
  const { data: me } = useSWR<Me>("/api/auth/me", fetcher);
  const wsId = me?.workspaceId ?? null;
  const isOwner = me?.role === "owner";
  const { data: mData, mutate } = useSWR<{ members: Member[] }>(
    wsId ? `/api/workspaces/${wsId}/members` : null,
    fetcher
  );
  const members = mData?.members ?? [];

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function addMember() {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/workspaces/${wsId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    }).then((x) => x.json());
    setBusy(false);
    if (r.ok) {
      setEmail("");
      mutate();
    } else setError(r.error || "Could not add member.");
  }

  async function changeRole(memberId: string, newRole: string) {
    await fetch(`/api/workspaces/${wsId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: newRole }),
    });
    mutate();
  }

  async function remove(memberId: string) {
    await fetch(`/api/workspaces/${wsId}/members?memberId=${memberId}`, { method: "DELETE" });
    if (memberId === me?.userId) {
      // Left the workspace — switch back to personal.
      window.location.href = "/local";
      return;
    }
    mutate();
  }

  async function rename() {
    const name = window.prompt("Rename workspace", me?.workspaceName ?? "")?.trim();
    if (!name) return;
    await fetch(`/api/workspaces/${wsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    window.location.reload();
  }

  async function deleteWs() {
    if (!window.confirm("Delete this workspace and everything in it? This cannot be undone.")) return;
    const r = await fetch(`/api/workspaces/${wsId}`, { method: "DELETE" }).then((x) => x.json());
    if (r.ok) window.location.href = "/local";
    else alert(r.error || "Could not delete.");
  }

  const isPersonal = me?.workspacePersonal ?? false;

  return (
    <NavigationLayout>
      <div className="mx-auto w-full max-w-2xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{me?.workspaceName ?? "Workspace"}</h1>
            <p className="text-sm text-neutral-500">
              {isPersonal
                ? "Your personal workspace. Create a shared one from the switcher to collaborate."
                : `${members.length} member${members.length === 1 ? "" : "s"} · you are ${me?.role}`}
            </p>
          </div>
          {isOwner && !isPersonal && (
            <button onClick={rename} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Rename
            </button>
          )}
        </div>

        {/* Add member (owner, shared workspaces only) */}
        {isOwner && !isPersonal && (
          <div className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="mb-3 text-sm font-medium">Invite a teammate</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={input + " flex-1"}
                placeholder="their@email.com (must have an account)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <select className={input} value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button className={yellowBtn} disabled={busy || !email.trim()} onClick={addMember}>
                Add
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Members */}
        {!isPersonal && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-0 dark:border-neutral-800"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
                  {m.email.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{m.email}</span>
                {m.role === "owner" ? (
                  <span className="text-xs font-medium text-neutral-500">Owner</span>
                ) : isOwner ? (
                  <select
                    className={input + " py-1"}
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="text-xs capitalize text-neutral-500">{m.role}</span>
                )}
                {m.role !== "owner" && (isOwner || m.userId === me?.userId) && (
                  <button
                    onClick={() => remove(m.userId)}
                    title={m.userId === me?.userId ? "Leave workspace" : "Remove"}
                    className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <Trash size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Danger zone */}
        {isOwner && !isPersonal && (
          <div className="mt-8 rounded-xl border border-red-200 p-4 dark:border-red-900/50">
            <div className="mb-1 font-medium text-red-700 dark:text-red-400">Delete workspace</div>
            <p className="mb-3 text-sm text-neutral-500">
              Removes the workspace and all its connections, boards, schedules, and comments.
            </p>
            <button
              onClick={deleteWs}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Delete this workspace
            </button>
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}
