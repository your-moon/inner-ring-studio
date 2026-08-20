import { cloudLinkUrl, IS_LINKED, setCloudSession } from "@/lib/cloud-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shown in the SYSTEM browser after cloud sign-in. The desktop window itself
// notices the new session by polling /api/cloud-link.
function page(title: string, message: string, ok: boolean): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0e0e0c; color:#f4f1ea;
         font-family: ui-sans-serif, -apple-system, system-ui, sans-serif; }
  .card { max-width:420px; text-align:center; padding:40px 32px; }
  .mark { width:52px; height:52px; border-radius:14px; background:${ok ? "#FFEB02" : "#2a2a26"};
          display:grid; place-items:center; margin:0 auto 22px; }
  h1 { font-size:22px; margin:0 0 10px; letter-spacing:-0.01em; }
  p { color:#a8a49a; font-size:15px; line-height:1.6; margin:0; }
</style></head>
<body><div class="card">
  <div class="mark">
    <svg width="30" height="30" viewBox="0 0 100 100"><circle cx="50" cy="50" r="26" fill="none" stroke="#111" stroke-width="9"/><circle cx="50" cy="50" r="9" fill="#111"/></svg>
  </div>
  <h1>${title}</h1>
  <p>${message}</p>
</div></body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: Request) {
  const cloud = cloudLinkUrl();
  if (!IS_LINKED || !cloud)
    return page("Not linked", "This app isn't linked to a cloud.", false);

  const code = new URL(req.url).searchParams.get("code");
  if (!code) return page("Missing code", "No sign-in code was provided.", false);

  const res = await fetch(`${cloud}/api/auth/link/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).catch(() => null);

  if (!res || !res.ok)
    return page("Link failed", "That sign-in code was invalid or expired. Try connecting again.", false);

  const j = (await res.json().catch(() => ({}))) as { cookie?: string; email?: string };
  if (!j.cookie || !j.email)
    return page("Link failed", "The cloud didn't return a session. Try again.", false);

  setCloudSession({ cookie: j.cookie, email: j.email });
  return page(
    "Connected",
    "You're signed in. Head back to Inner Ring Studio, you can close this tab.",
    true
  );
}
