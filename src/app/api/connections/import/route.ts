import { storeRoute, HttpError } from "@/lib/route";
import { listImportableConnections, importConnection } from "@/lib/cloud-db";

// Reads/writes the cloud DB — needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List connections in the caller's OTHER workspaces — candidates to import into
 * the active workspace. Cloud-only (the single-tenant vault has no workspaces).
 */
export const GET = storeRoute(
  { cloudOnly: true, whenNotCloud: () => Response.json({ connections: [] }) },
  async ({ ctx }) => {
    if (!ctx.userId || !ctx.workspaceId) return { connections: [] };
    const connections = await listImportableConnections(ctx.userId, ctx.workspaceId);
    return { connections };
  }
);

/** Copy a connection (from any workspace the caller belongs to) into this one. */
export const POST = storeRoute(
  {
    cloudOnly: true,
    whenNotCloud: () =>
      Response.json({ error: "Importing needs Cloud." }, { status: 400 }),
    minRole: "editor",
    roleMessage: "Viewers can't add connections.",
  },
  async ({ ctx, body }) => {
    if (!ctx.userId || !ctx.workspaceId)
      throw new HttpError(401, "Not signed in.");
    const sourceId = (body as { sourceId?: string }).sourceId;
    if (!sourceId) throw new HttpError(400, "sourceId required");
    try {
      const safe = await importConnection(ctx.userId, ctx.workspaceId, sourceId);
      if (!safe) throw new HttpError(404, "Connection not found.");
      return { ok: true, connection: safe };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
  }
);
