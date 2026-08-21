import { authRoute } from "@/lib/route";
import {
  listNotifications,
  markNotifications,
  unreadCount,
} from "@/lib/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Non-cloud has no notifications — return a quiet payload so the nav bell can
// call this unconditionally without special-casing the mode.
export const GET = authRoute(
  {
    forward: true,
    cloudOnly: true,
    whenNotCloud: () => Response.json({ notifications: [], unread: 0 }),
  },
  async ({ ctx }) => {
    const uid = ctx.userId!; // cloudOnly gate → always a real user here.
    const [notifications, unread] = await Promise.all([
      listNotifications(uid),
      unreadCount(uid),
    ]);
    return { notifications, unread };
  }
);

export const POST = authRoute(
  {
    forward: true,
    cloudOnly: true,
    whenNotCloud: () => Response.json({ ok: true }),
  },
  async ({ ctx, body }) => {
    const b = body as { ids?: string[]; all?: boolean };
    await markNotifications(ctx.userId!, b.all ? "all" : b.ids ?? []);
    return { ok: true };
  }
);
