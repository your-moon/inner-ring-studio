import { cloudNewId, cloudPool, ensureSchema } from "./cloud-db";

/**
 * Cloud-only team workspaces. Resources (connections, boards, schedules,
 * comments) belong to a workspace; membership + role govern access. Every user
 * has a personal workspace (created by the migration in ensureSchema).
 */

export type Role = "owner" | "editor" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  personal: boolean;
  role: Role;
  memberCount: number;
}

export interface Member {
  userId: string;
  email: string;
  role: Role;
}

const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };
/** True if `role` meets or exceeds `min`. */
export function roleAtLeast(role: Role | null | undefined, min: Role): boolean {
  return !!role && RANK[role] >= RANK[min];
}

export async function listMyWorkspaces(userId: string): Promise<Workspace[]> {
  await ensureSchema();
  const res = await cloudPool().query(
    `SELECT w.id, w.name, w.personal, m.role,
            (SELECT count(*)::int FROM workspace_members mm WHERE mm.workspace_id = w.id) AS member_count
       FROM workspaces w
       JOIN workspace_members m ON m.workspace_id = w.id
      WHERE m.user_id = $1
      ORDER BY w.personal DESC, w.created_at`,
    [userId]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    personal: Boolean(r.personal),
    role: r.role as Role,
    memberCount: r.member_count as number,
  }));
}

/** The caller's role in a workspace, or null if not a member. */
export async function getRole(userId: string, workspaceId: string): Promise<Role | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
    [workspaceId, userId]
  );
  return (res.rows[0]?.role as Role) ?? null;
}

/** The user's personal workspace id (guaranteed to exist post-migration). */
export async function personalWorkspaceId(userId: string): Promise<string | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    "SELECT id FROM workspaces WHERE owner_id = $1 AND personal LIMIT 1",
    [userId]
  );
  return (res.rows[0]?.id as string) ?? null;
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  await ensureSchema();
  const id = cloudNewId();
  await cloudPool().query(
    "INSERT INTO workspaces (id, name, owner_id, personal) VALUES ($1,$2,$3,false)",
    [id, name, userId]
  );
  await cloudPool().query(
    "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,'owner')",
    [id, userId]
  );
  return { id, name, personal: false, role: "owner", memberCount: 1 };
}

export async function renameWorkspace(
  userId: string,
  workspaceId: string,
  name: string
): Promise<boolean> {
  if (!roleAtLeast(await getRole(userId, workspaceId), "owner")) return false;
  const res = await cloudPool().query(
    "UPDATE workspaces SET name = $1 WHERE id = $2 AND personal = false",
    [name, workspaceId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  // Only the owner may delete, and never a personal workspace.
  const res = await cloudPool().query(
    "DELETE FROM workspaces WHERE id = $1 AND owner_id = $2 AND personal = false",
    [workspaceId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listMembers(userId: string, workspaceId: string): Promise<Member[] | null> {
  if (!(await getRole(userId, workspaceId))) return null; // not a member
  const res = await cloudPool().query(
    `SELECT m.user_id, u.email, m.role
       FROM workspace_members m JOIN users u ON u.id = m.user_id
      WHERE m.workspace_id = $1
      ORDER BY (m.role = 'owner') DESC, u.email`,
    [workspaceId]
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    userId: r.user_id as string,
    email: r.email as string,
    role: r.role as Role,
  }));
}

export async function setMemberRole(
  userId: string,
  workspaceId: string,
  memberId: string,
  role: Role
): Promise<boolean> {
  if (!roleAtLeast(await getRole(userId, workspaceId), "owner")) return false;
  // Don't allow demoting the workspace owner via this path.
  const res = await cloudPool().query(
    `UPDATE workspace_members SET role = $1
      WHERE workspace_id = $2 AND user_id = $3
        AND user_id <> (SELECT owner_id FROM workspaces WHERE id = $2)`,
    [role === "owner" ? "editor" : role, workspaceId, memberId]
  );
  return (res.rowCount ?? 0) > 0;
}

export interface Invite {
  token: string;
  email: string;
  role: Role;
  workspaceId: string;
  workspaceName: string;
  accepted: boolean;
}

/**
 * Owner-only: create an email-bound invite link. If an account with that email
 * already exists, they're also added immediately (the link still works and is
 * idempotent). Returns the token and whether a direct add happened.
 */
export async function createInvite(
  userId: string,
  workspaceId: string,
  email: string,
  role: Role
): Promise<{ ok: boolean; error?: string; token?: string; addedDirectly?: boolean }> {
  if (!roleAtLeast(await getRole(userId, workspaceId), "owner"))
    return { ok: false, error: "Only the owner can invite." };
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return { ok: false, error: "Enter a valid email." };
  const safeRole: Role = role === "owner" ? "editor" : role;
  const token = cloudNewId() + cloudNewId(); // 192-bit opaque token
  await cloudPool().query(
    `INSERT INTO workspace_invites (token, workspace_id, email, role, created_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [token, workspaceId, normalized, safeRole, userId]
  );
  // Fast path: if they already have an account, add them now.
  const u = await cloudPool().query("SELECT id FROM users WHERE email = $1", [normalized]);
  let addedDirectly = false;
  if (u.rows[0]?.id) {
    await cloudPool().query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1,$2,$3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [workspaceId, u.rows[0].id, safeRole]
    );
    addedDirectly = true;
  }
  return { ok: true, token, addedDirectly };
}

/** Public-ish (for the accept page): the invite's details, or null. */
export async function getInvite(token: string): Promise<Invite | null> {
  await ensureSchema();
  const res = await cloudPool().query(
    `SELECT i.token, i.email, i.role, i.workspace_id, i.accepted_at, w.name
       FROM workspace_invites i JOIN workspaces w ON w.id = i.workspace_id
      WHERE i.token = $1`,
    [token]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    token: r.token,
    email: r.email,
    role: r.role,
    workspaceId: r.workspace_id,
    workspaceName: r.name,
    accepted: r.accepted_at != null,
  };
}

/**
 * Accept an invite: the signed-in user's email must match the invite's email.
 * Idempotent — accepting again just confirms membership.
 */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ ok: boolean; error?: string; workspaceId?: string }> {
  await ensureSchema();
  const invite = await getInvite(token);
  if (!invite) return { ok: false, error: "This invite link is invalid." };
  if (invite.email !== userEmail.trim().toLowerCase())
    return {
      ok: false,
      error: `This invite is for ${invite.email}. Sign in with that account to accept.`,
    };
  await cloudPool().query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1,$2,$3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [invite.workspaceId, userId, invite.role]
  );
  await cloudPool().query(
    "UPDATE workspace_invites SET accepted_at = now() WHERE token = $1 AND accepted_at IS NULL",
    [token]
  );
  return { ok: true, workspaceId: invite.workspaceId };
}

export async function removeMember(
  userId: string,
  workspaceId: string,
  memberId: string
): Promise<boolean> {
  // Owner can remove anyone (except the owner); a member can remove themselves.
  const myRole = await getRole(userId, workspaceId);
  const isOwner = roleAtLeast(myRole, "owner");
  if (!isOwner && memberId !== userId) return false;
  const res = await cloudPool().query(
    `DELETE FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2
        AND user_id <> (SELECT owner_id FROM workspaces WHERE id = $1)`,
    [workspaceId, memberId]
  );
  return (res.rowCount ?? 0) > 0;
}
