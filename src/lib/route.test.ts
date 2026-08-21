/** @jest-environment node */
// Tests the shared API-route core (makeRoute) at its interface: the invariant
// request sequence — forward → cloud-gate → resolve ctx → role gate → body
// validate → handler → serialize / map HttpError. Exercised through makeRoute
// with a fake resolver + fake handler, which is the whole surface the three
// public wrappers (workspaceRoute/storeRoute/authRoute) share.
import { z } from "zod";

// IS_LINKED / IS_CLOUD / forwardToCloud are the only runtime environment the core
// reads; make them mutable per-test. (jest requires the closed-over name to start
// with "mock".)
const mockState = { linked: false, cloud: true };
jest.mock("./cloud-link", () => ({
  get IS_LINKED() {
    return mockState.linked;
  },
  forwardToCloud: jest.fn(
    async () =>
      new Response(JSON.stringify({ forwarded: true }), {
        status: 299,
        headers: { "content-type": "application/json" },
      })
  ),
}));
jest.mock("./mode", () => ({
  get IS_CLOUD() {
    return mockState.cloud;
  },
}));

import { makeRoute, HttpError } from "./route";

const req = (method = "GET", body?: unknown) =>
  new Request("http://x/api/thing", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

// Next hands route handlers a second arg carrying the params Promise; supply it.
const call = (
  fn: (r: Request, a: { params: Promise<Record<string, string>> }) => Promise<Response>,
  request: Request,
  params: Record<string, string> = {}
) => fn(request, { params: Promise.resolve(params) });

beforeEach(() => {
  mockState.linked = false;
  mockState.cloud = true;
});

describe("makeRoute — the shared route core", () => {
  test("1. forwards to cloud when linked, without resolving ctx", async () => {
    const resolve = jest.fn(async () => ({ userId: "u1" }));
    mockState.linked = true;
    const route = makeRoute(resolve, { forward: true, cloudOnly: true });
    const res = await call(route({}, async () => ({ ok: true })), req());
    expect(res.status).toBe(299);
    expect(resolve).not.toHaveBeenCalled();
  });

  test("2. cloudOnly returns 404 off-cloud; whenNotCloud overrides the shape", async () => {
    mockState.cloud = false;
    const route = makeRoute(async () => ({ userId: "u1" }), { cloudOnly: true });
    const res = await call(route({}, async () => ({ ok: true })), req());
    expect(res.status).toBe(404);

    const custom = makeRoute(async () => ({ userId: "u1" }), { cloudOnly: true });
    const res2 = await call(
      custom(
        { whenNotCloud: () => Response.json({ cloud: false, comments: [] }) },
        async () => ({ ok: true })
      ),
      req()
    );
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ cloud: false, comments: [] });
  });

  test("3. a resolver Response (401) passes straight through", async () => {
    const route = makeRoute(
      async () =>
        new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
      {}
    );
    const res = await call(route({}, async () => ({ ok: true })), req());
    expect(res.status).toBe(401);
  });

  test("4. role below minRole → 403 with the custom message", async () => {
    const route = makeRoute(async () => ({ userId: "u1", role: "viewer" }), {});
    const res = await call(
      route(
        { minRole: "editor", roleMessage: "Viewers can't create boards." },
        async () => ({ ok: true })
      ),
      req("POST", {})
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Viewers can't create boards." });
  });

  test("4b. sufficient role passes the gate", async () => {
    const route = makeRoute(async () => ({ userId: "u1", role: "owner" }), {});
    const res = await call(
      route({ minRole: "editor" }, async () => ({ ok: true })),
      req("POST", {})
    );
    expect(res.status).toBe(200);
  });

  test("5. invalid body → 400 zod message; valid body reaches the handler typed", async () => {
    const schema = z.object({ name: z.string().min(1, "name required") });
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    const bad = await call(
      route({ schema }, async () => ({ ok: true })),
      req("POST", { name: "" })
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "name required" });

    let seen: unknown;
    const good = await call(
      route({ schema }, async ({ body }) => {
        seen = body;
        return { ok: true };
      }),
      req("POST", { name: "hi" })
    );
    expect(good.status).toBe(200);
    expect(seen).toEqual({ name: "hi" });
  });

  test("6. a plain object return is serialized as 200 JSON", async () => {
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    const res = await call(route({}, async () => ({ board: { id: "b1" } })), req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ board: { id: "b1" } });
  });

  test("7. throwing HttpError maps to its status + message", async () => {
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    const res = await call(
      route({}, async () => {
        throw new HttpError(404, "not found");
      }),
      req()
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  test("7b. a non-HttpError bubbles (becomes a 500 at the framework)", async () => {
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    await expect(
      call(
        route({}, async () => {
          throw new Error("boom");
        }),
        req()
      )
    ).rejects.toThrow("boom");
  });

  test("8. a raw Response return passes through untouched", async () => {
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    const res = await call(
      route({}, async () => new Response("stream", { status: 206 })),
      req()
    );
    expect(res.status).toBe(206);
    expect(await res.text()).toBe("stream");
  });

  test("9. route params are awaited and handed to the handler", async () => {
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    let seen: unknown;
    const res = await call(
      route({}, async ({ params }) => {
        seen = params;
        return { ok: true };
      }),
      req(),
      { id: "abc" }
    );
    expect(res.status).toBe(200);
    expect(seen).toEqual({ id: "abc" });
  });

  test("10. GET skips body parsing (body is undefined)", async () => {
    const route = makeRoute(async () => ({ userId: "u1" }), {});
    let seen: unknown = "unset";
    await call(
      route({}, async ({ body }) => {
        seen = body;
        return { ok: true };
      }),
      req("GET")
    );
    expect(seen).toBeUndefined();
  });
});
