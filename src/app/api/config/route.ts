import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import {
  configDir,
  isRepo,
  linkRepo,
  remoteUrl,
  sync,
} from "@/lib/config-repo";
import { vaultPath } from "@/lib/vault";

// git + fs operations — Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The git-backed vault only exists in self-hosted/desktop; never expose the
// server's filesystem paths in cloud mode.
function cloudGuard(): Response | null {
  return IS_CLOUD ? NextResponse.json({ error: "not found" }, { status: 404 }) : null;
}

export async function GET() {
  const gate = cloudGuard();
  if (gate) return gate;
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  return NextResponse.json({
    vaultPath: vaultPath(),
    configDir: configDir(),
    isRepo: isRepo(),
    remote: remoteUrl(),
  });
}

export async function POST(req: Request) {
  const gate = cloudGuard();
  if (gate) return gate;
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json();
    if (body.action === "link") {
      if (!body.url || typeof body.url !== "string") {
        return NextResponse.json({ error: "url required" }, { status: 400 });
      }
      const res = linkRepo(body.url.trim());
      return NextResponse.json({ ok: true, message: res.message });
    }
    if (body.action === "sync") {
      const res = sync();
      return NextResponse.json({ ok: res.ok, message: res.message });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
