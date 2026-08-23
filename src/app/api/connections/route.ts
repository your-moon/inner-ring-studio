import { storeRoute, HttpError } from "@/lib/route";
import { commitConfig } from "@/lib/config-repo";
import {
  getLastRemoteChangeAt,
  scheduleBackgroundSync,
} from "@/lib/vault-sync";
import { getConnectionStore, IS_CLOUD } from "@/lib/mode";

// Reads the vault / cloud DB (fs + crypto / pg) — needs the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = getConnectionStore();

/** Environment is a closed vocabulary; anything else is treated as unset. */
function envOf(v: unknown): "production" | "staging" | undefined {
  return v === "production" || v === "staging" ? v : undefined;
}

// Vault-git-sync only applies to the single-tenant vault store; cloud persists
// directly in its database.
function commitLocal(msg: string) {
  if (!IS_CLOUD) {
    commitConfig(msg);
    // Auto-sync the git-vault out of band (no-op unless a repo is linked).
    scheduleBackgroundSync();
  }
}

/**
 * List the caller's connections (passwords stripped). In cloud mode this is
 * scoped to the authenticated user; in local mode it's the single vault.
 */
export const GET = storeRoute({}, async ({ ctx }) => {
  // Pull remote vault changes in the background (throttled; no-op unless linked).
  if (!IS_CLOUD) scheduleBackgroundSync();
  // syncedAt bumps when a background sync pulls in remote changes — the client
  // watches it to notify the user their connection list updated.
  const syncedAt = IS_CLOUD ? 0 : getLastRemoteChangeAt();
  try {
    return { connections: await store.list(ctx), syncedAt };
  } catch (e) {
    // Vault locked / passphrase missing is an expected state, not a 500.
    return {
      connections: [],
      syncedAt,
      error: e instanceof Error ? e.message : String(e),
    };
  }
});

/** Create a connection (used by the in-app "new connection" form). */
export const POST = storeRoute(
  { minRole: "editor", roleMessage: "Viewers can't add connections." },
  async ({ ctx, body }) => {
    const b = body as Record<string, unknown>;
    if (!b.name || !b.host || !b.port)
      throw new HttpError(400, "name, host, port required");
    const driver = ["clickhouse", "mysql"].includes(b.driver as string)
      ? (b.driver as string)
      : "postgres";
    try {
      const safe = await store.add(ctx, {
        name: b.name as string,
        driver: driver as "postgres" | "mysql" | "clickhouse",
        host: b.host as string,
        port: Number(b.port),
        database: b.database as string,
        user: b.user as string,
        password: b.password as string,
        ssl: !!b.ssl,
        folder: (b.folder as string) || undefined,
        timezone: (b.timezone as string) || undefined,
        readOnly: !!b.readOnly,
        environment: envOf(b.environment),
      });
      commitLocal(`pmsql: add connection ${safe.name}`);
      return { ok: true, connection: safe };
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
  }
);

/** Edit a connection. Provided fields overwrite; an omitted password is kept. */
export const PUT = storeRoute(
  { minRole: "editor", roleMessage: "Viewers can't edit connections." },
  async ({ ctx, body }) => {
    const b = body as Record<string, unknown>;
    if (!b.id) throw new HttpError(400, "id required");
    try {
      const safe = await store.update(ctx, b.id as string, {
        name: b.name as string,
        host: b.host as string,
        port: b.port !== undefined ? Number(b.port) : undefined,
        database: b.database as string,
        user: b.user as string,
        password: b.password as string, // "" or undefined = unchanged
        ssl: b.ssl as boolean,
        folder: b.folder as string,
        timezone: b.timezone as string,
        readOnly: b.readOnly as boolean,
        // Only apply when the caller sent the field; distinguish "clear" ("")
        // from "leave unchanged" (absent).
        ...(b.environment !== undefined
          ? { environment: envOf(b.environment) }
          : {}),
      });
      if (!safe) throw new HttpError(404, "unknown connection");
      commitLocal(`pmsql: update connection ${safe.name}`);
      return { ok: true, connection: safe };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
  }
);

/** Delete a connection. */
export const DELETE = storeRoute(
  { minRole: "editor", roleMessage: "Viewers can't delete connections." },
  async ({ ctx, req }) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new HttpError(400, "id required");
    const removed = await store.remove(ctx, id);
    if (removed) commitLocal(`pmsql: remove connection ${id}`);
    return { ok: removed };
  }
);
