import { authRoute, HttpError } from "@/lib/route";
import { createLinkCode } from "@/lib/cloud-link-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a one-time link code for the signed-in cloud user. Called from the /link
 * consent page (in the browser). The desktop then redeems the code via
 * /api/auth/link/exchange.
 */
export const POST = authRoute({ cloudOnly: true }, async ({ ctx }) => {
  const res = await createLinkCode(ctx.userId!);
  if (!res) throw new HttpError(404, "user not found");
  return { code: res.code, email: res.email };
});
