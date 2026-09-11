import { requireAuth } from "@/lib/auth";
import {
  applyWorkspaceConnectionsMerge,
  getWorkspaceConnectionsRaw,
} from "@/lib/cloud-db";
import { IS_CLOUD } from "@/lib/mode";
import type { VaultConnection } from "@/lib/vault";
import type { Tombstone } from "@/lib/vault-merge";
import { personalWorkspaceId } from "@/lib/workspaces";

/**
 * Cloud <-> local vault connection sync (see
 * docs/superpowers/specs/2026-09-11-cloud-vault-sync-design.md). Called by a
 * LINKED LOCAL SERVER (src/lib/cloud-vault-sync.ts) with the same session
 * cookie forwardToCloud already uses — never by the browser SPA, and never
 * itself forwarded (it IS the sync target).
 *
 * Deliberately does NOT go through storeRoute/workspaceRoute: those resolve
 * the caller's ACTIVE workspace (the `irs_ws` cookie), but this route must
 * always resolve the caller's PERSONAL workspace regardless of whatever
 * workspace their UI session has selected -- a client can never point it at
 * a shared team workspace.
 */

// Reads/writes the cloud DB -- needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notCloud(): Response {
  return Response.json({ error: "Cloud only." }, { status: 404 });
}

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

async function resolvePersonalWorkspace(): Promise<
  { userId: string; workspaceId: string } | Response
> {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (!auth.userId) return unauthorized();
  const workspaceId = await personalWorkspaceId(auth.userId);
  if (!workspaceId)
    return Response.json({ error: "no personal workspace" }, { status: 404 });
  return { userId: auth.userId, workspaceId };
}

export async function GET(): Promise<Response> {
  if (!IS_CLOUD) return notCloud();
  const ctx = await resolvePersonalWorkspace();
  if (ctx instanceof Response) return ctx;
  const raw = await getWorkspaceConnectionsRaw(ctx.workspaceId);
  return Response.json(raw);
}

interface RawConnectionInput {
  id: string;
  name: string;
  driver: string;
  host: string;
  port: number;
  updatedAt: number;
  [key: string]: unknown;
}

interface RawTombstoneInput {
  id: string;
  deletedAt: number;
}

function isValidBody(body: unknown): body is {
  connections: RawConnectionInput[];
  tombstones: RawTombstoneInput[];
  expectedVersion: number;
} {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.connections) || !Array.isArray(b.tombstones)) return false;
  if (typeof b.expectedVersion !== "number") return false;
  return b.connections.every(
    (c) =>
      c &&
      typeof c === "object" &&
      typeof (c as RawConnectionInput).id === "string" &&
      typeof (c as RawConnectionInput).name === "string" &&
      typeof (c as RawConnectionInput).host === "string" &&
      typeof (c as RawConnectionInput).port === "number" &&
      typeof (c as RawConnectionInput).updatedAt === "number"
  );
}

export async function POST(req: Request): Promise<Response> {
  if (!IS_CLOUD) return notCloud();
  const ctx = await resolvePersonalWorkspace();
  if (ctx instanceof Response) return ctx;

  const body = await req.json().catch(() => null);
  if (!isValidBody(body)) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await applyWorkspaceConnectionsMerge(ctx.workspaceId, ctx.userId, {
    // isValidBody only checks the fields this route cares about (id, name,
    // host, port, updatedAt); the rest of each connection's shape is trusted
    // to the caller, same as writeMerged trusts its `merged` argument in
    // vault-sync.ts's git ports.
    connections: body.connections as unknown as VaultConnection[],
    tombstones: body.tombstones as unknown as Tombstone[],
    expectedVersion: body.expectedVersion,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error ?? "conflict", version: result.version },
      { status: 409 }
    );
  }
  return Response.json({ version: result.version });
}
