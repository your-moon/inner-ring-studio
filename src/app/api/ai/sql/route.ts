import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const run = promisify(execFile);

/**
 * Generate a PostgreSQL query from a natural-language request using the Claude
 * CLI (`claude -p`), which authenticates with the user's Claude subscription —
 * no API key needed. Requires the `claude` CLI installed + `claude login` on
 * whichever machine serves this route (the user's machine for the local/desktop
 * app; the host for the hosted instance).
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { prompt, schema } = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    schema?: string;
  };
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const instructions = [
    "You are a PostgreSQL expert. Generate exactly ONE valid PostgreSQL query",
    "for the user's request. Return ONLY the SQL — no markdown fences, no",
    "explanation, no comments.",
    schema ? `\nSchema:\n${schema}` : "",
    `\nRequest: ${prompt}`,
  ].join(" ");

  try {
    const { stdout } = await run("claude", ["-p", instructions], {
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    // Strip accidental markdown fences.
    const sql = stdout
      .trim()
      .replace(/^```sql\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();
    return NextResponse.json({ sql });
  } catch (e) {
    const err = e as { code?: string; stderr?: string; message?: string };
    const message =
      err.code === "ENOENT"
        ? "Claude CLI not found on the server. Install it and run `claude login`."
        : err.stderr || err.message || String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
