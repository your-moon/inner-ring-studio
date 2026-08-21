import { IS_LINKED, forwardToCloud } from "./cloud-link";
import { IS_CLOUD } from "./mode";
import { roleAtLeast, type Role } from "./workspaces";
import { requireWorkspace, type WorkspaceContext } from "./workspace-context";
import { requireStoreContext } from "./workspace-context";
import { requireAuth } from "./auth";
import type { AuthContext } from "./connection-store";
import type { z } from "zod";

/**
 * The shared API-route core. One `makeRoute` composes the request ceremony every
 * cloud/data route used to hand-repeat — linked-mode forwarding, cloud gating,
 * context resolution, role gating, body validation, and error mapping — so a
 * handler just receives a resolved context plus a parsed body and returns data
 * (or throws an {@link HttpError}). Three typed wrappers (`workspaceRoute`,
 * `storeRoute`, `authRoute`) differ only in which context they resolve.
 *
 * The invariant sequence is: forward → cloud-gate → resolve ctx → role gate →
 * body validate → handler → serialize / map HttpError. Order matters: forward
 * runs before the cloud-gate so a linked desktop reaches the cloud even though
 * it is not itself cloud.
 */

/** Thrown by a handler to return a non-2xx JSON error. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export interface RouteConfig<Body> {
  /** Minimum role required (default: any authenticated caller). */
  minRole?: Role;
  /** Custom 403 message when the role gate rejects. */
  roleMessage?: string;
  /** Validate + narrow the request body; a parse failure becomes a 400. */
  schema?: z.ZodType<Body>;
  /** This route is a Cloud-only feature. */
  cloudOnly?: boolean;
  /** What to return off-cloud instead of the default 404. */
  whenNotCloud?: () => Response;
  /** In linked (desktop) mode, forward this request to the cloud. */
  forward?: boolean;
}

interface WrapperDefaults {
  forward?: boolean;
  cloudOnly?: boolean;
}

/** Next 15 hands dynamic route handlers a second arg carrying a params Promise. */
interface RouteArgs<Params> {
  params: Promise<Params>;
}

interface HandlerArgs<Ctx, Body, Params> {
  ctx: Ctx;
  req: Request;
  params: Params;
  body: Body;
}

type Handler<Ctx, Body, Params> = (
  a: HandlerArgs<Ctx, Body, Params>
) => Promise<unknown>;

export function makeRoute<Ctx>(
  resolve: () => Promise<Ctx | Response>,
  defaults: WrapperDefaults
) {
  return function route<Body = unknown, Params = Record<string, string>>(
    config: RouteConfig<Body>,
    handler: Handler<Ctx, Body, Params>
    // The required, non-optional second arg matches Next 15's generated route
    // type check (an optional one surfaces as `... | undefined` and is rejected).
  ): (req: Request, args: RouteArgs<Params>) => Promise<Response> {
    const forward = config.forward ?? defaults.forward ?? false;
    const cloudOnly = config.cloudOnly ?? defaults.cloudOnly ?? false;

    return async (req, args) => {
      // 1. linked desktop → forward the collaborative request to the cloud.
      if (forward && IS_LINKED) return forwardToCloud(req);
      // 2. cloud-only feature reached off-cloud.
      if (cloudOnly && !IS_CLOUD)
        return config.whenNotCloud
          ? config.whenNotCloud()
          : json({ error: "This is a Cloud feature." }, 404);
      // 3. resolve caller context; a Response means auth failed.
      const ctx = await resolve();
      if (ctx instanceof Response) return ctx;
      // 4. role gate ("viewer" is the floor → no gate).
      if (config.minRole && config.minRole !== "viewer") {
        const role = (ctx as { role?: Role | string | null }).role as
          | Role
          | null
          | undefined;
        if (!roleAtLeast(role ?? null, config.minRole))
          return json({ error: config.roleMessage ?? "Insufficient role." }, 403);
      }
      // 5. body: parsed for mutations, validated when a schema is given.
      let body: Body | undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const raw = await req.json().catch(() => ({}));
        if (config.schema) {
          const parsed = config.schema.safeParse(raw);
          if (!parsed.success)
            return json(
              {
                error:
                  parsed.error.issues[0]?.message ?? "Invalid request body.",
              },
              400
            );
          body = parsed.data;
        } else {
          body = raw as Body;
        }
      }
      const params = (args?.params ? await args.params : undefined) as Params;
      // 6. run the handler; serialize data, map HttpError, pass a Response through.
      try {
        const out = await handler({ ctx, req, params, body: body as Body });
        return out instanceof Response ? out : json(out);
      } catch (e) {
        if (e instanceof HttpError) return json({ error: e.message }, e.status);
        throw e;
      }
    };
  };
}

/** Workspace-scoped cloud feature: forwarded in linked mode, 404 off-cloud. */
export const workspaceRoute = makeRoute<WorkspaceContext>(requireWorkspace, {
  forward: true,
  cloudOnly: true,
});

/** Data-plane route that runs in every deploy mode (never forwarded). */
export const storeRoute = makeRoute<AuthContext>(requireStoreContext, {
  forward: false,
});

/** Plain authenticated route (no workspace scope). */
export const authRoute = makeRoute<{ userId: string | null }>(requireAuth, {
  forward: false,
});
