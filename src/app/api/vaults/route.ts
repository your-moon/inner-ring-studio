import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/mode";
import {
  addVault,
  forgetVault,
  listVaults,
  switchVault,
} from "@/lib/vault-manager";

// git + fs operations — Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Multi-vault is a desktop / self-hosted concept: the registry lives on the
// local filesystem. Cloud is multi-tenant with no such registry.
function cloudGuard(): Response | null {
  return IS_CLOUD ? NextResponse.json({ error: "not found" }, { status: 404 }) : null;
}

export async function GET() {
  const gate = cloudGuard();
  if (gate) return gate;
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  return NextResponse.json({ vaults: listVaults() });
}

export async function POST(req: Request) {
  const gate = cloudGuard();
  if (gate) return gate;
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json();
    switch (body.action) {
      case "add": {
        const { entry, message } = addVault({
          name: body.name,
          mode: body.mode === "link" ? "link" : "create",
          url: body.url,
        });
        return NextResponse.json({ ok: true, id: entry.id, message });
      }
      case "switch": {
        if (!body.id || typeof body.id !== "string") {
          return NextResponse.json({ error: "id required" }, { status: 400 });
        }
        return NextResponse.json({ ok: true, ...switchVault(body.id) });
      }
      case "remove": {
        if (!body.id || typeof body.id !== "string") {
          return NextResponse.json({ error: "id required" }, { status: 400 });
        }
        return NextResponse.json({ ok: true, ...forgetVault(body.id) });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
