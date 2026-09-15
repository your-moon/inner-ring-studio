#!/usr/bin/env node
/*
 * Acceptance probe for the Run split-button (src/app/split-button.css).
 *
 * Asserts the *computed* result of the fix against a real, running target —
 * not the source. The bug it guards against is a cascade bug: the crisp
 * action-button recipe is unlayered CSS and silently beats every Tailwind
 * `rounded-*` / `px-*` utility, so the two halves rendered as separate pills.
 * Source-level checks can't see that; only computed style on a live page can.
 *
 * Probe surface is /embed/sqlite. AuthGuard exempts /embed (the desktop app
 * supplies DB access over local IPC), and the embed Studio opens on a query tab,
 * so the split button renders with no login and no interaction. Its schema
 * sidebar errors out without a parent frame — that is expected and irrelevant
 * here; only the toolbar is under test. Do NOT retarget this at an authed route:
 * a logged-in browser profile makes it pass for the wrong reason.
 *
 * Zero dependencies: Node >= 22 has a global WebSocket, so this drives its own
 * headless Chrome over the DevTools Protocol directly.
 *
 *   node scripts/probe-split-button.mjs [baseUrl]
 *
 * Default baseUrl is https://cloud.carrot-soft.tech. Exits 0 on pass, 1 on
 * fail, 2 if the probe itself could not run (Chrome missing, target down).
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] || "https://cloud.carrot-soft.tech").replace(
  /\/+$/,
  ""
);
const URL_UNDER_TEST = `${BASE}/embed/sqlite`;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

/* The assertion itself. Runs inside the page; returns a plain object so the
 * failure message can name the actual value, not just "expected true". */
const PAGE_ASSERTION = `
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let run = null;
  // The GUI mounts a WASM SQLite engine before the toolbar exists.
  for (let i = 0; i < 60; i++) {
    run = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Run"
    );
    if (run) break;
    await sleep(500);
  }
  if (!run) return { ok: false, fatal: "Run button never rendered" };

  const wrap = run.parentElement;
  const trigger = wrap.children[1];
  if (!trigger) return { ok: false, fatal: "split button has no dropdown trigger" };

  const cr = getComputedStyle(run);
  const ct = getComputedStyle(trigger);
  const gr = run.getBoundingClientRect();
  const gt = trigger.getBoundingClientRect();

  const measured = {
    runRadiusTR: cr.borderTopRightRadius,
    runRadiusBR: cr.borderBottomRightRadius,
    trigRadiusTL: ct.borderTopLeftRadius,
    trigRadiusBL: ct.borderBottomLeftRadius,
    trigBoxShadow: ct.boxShadow,
    trigWidth: +gt.width.toFixed(1),
    runHeight: +gr.height.toFixed(1),
    trigHeight: +gt.height.toFixed(1),
    trigAriaLabel: trigger.getAttribute("aria-label"),
    gapPx: +(gt.left - gr.right).toFixed(2),
  };

  const checks = [
    ["Run top-right corner is square", measured.runRadiusTR === "0px"],
    ["Run bottom-right corner is square", measured.runRadiusBR === "0px"],
    ["trigger top-left corner is square", measured.trigRadiusTL === "0px"],
    ["trigger bottom-left corner is square", measured.trigRadiusBL === "0px"],
    ["trigger draws the inset seam", /inset/.test(measured.trigBoxShadow)],
    ["trigger uses icon-only padding (<36px wide)", measured.trigWidth < 36],
    ["halves are flush (no gap)", Math.abs(measured.gapPx) < 0.5],
    ["halves are the same height", measured.runHeight === measured.trigHeight],
    [
      "trigger is labelled for screen readers",
      measured.trigAriaLabel === "More run options",
    ],
  ];

  return {
    ok: checks.every(([, pass]) => pass),
    checks: checks.map(([name, pass]) => ({ name, pass })),
    measured,
  };
})()
`;

async function cdp(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.id !== id) return;
      ws.removeEventListener("message", onMessage);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
      else resolve(msg.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error(
      "probe could not run: no Chrome/Chromium found (set CHROME_PATH)"
    );
    process.exit(2);
  }

  const profile = await mkdtemp(join(tmpdir(), "split-button-probe-"));
  const proc = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--window-size=1280,800",
      URL_UNDER_TEST,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  const cleanup = async () => {
    try {
      proc.kill("SIGKILL");
    } catch {
      /* already gone */
    }
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  };

  // Chrome prints the browser-level endpoint to stderr once it is listening;
  // that also tells us the ephemeral port it chose.
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Chrome did not report a debugging port in 30s")),
      30_000
    );
    let buf = "";
    proc.stderr.on("data", (d) => {
      buf += d.toString();
      const m = buf.match(/ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (code ${code})`));
    });
  });

  // Find the page target Chrome opened for URL_UNDER_TEST. Chrome starts on
  // about:blank and navigates, so wait for a target actually on our origin —
  // attaching too early means the context is torn out from under Runtime.evaluate.
  let pageWsUrl = null;
  for (let i = 0; i < 80 && !pageWsUrl; i++) {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`).catch(
      () => null
    );
    if (res?.ok) {
      const targets = await res.json();
      const page = targets.find(
        (t) =>
          t.type === "page" &&
          t.webSocketDebuggerUrl &&
          t.url.startsWith(`${BASE}/`)
      );
      if (page) pageWsUrl = page.webSocketDebuggerUrl;
    }
    if (!pageWsUrl) await new Promise((r) => setTimeout(r, 250));
  }
  if (!pageWsUrl) {
    await cleanup();
    console.error("probe could not run: no page target appeared");
    process.exit(2);
  }

  const ws = new WebSocket(pageWsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("CDP socket failed")), {
      once: true,
    });
  });

  // A client-side route change can still destroy the context mid-evaluate;
  // that's a transient, not a failure, so retry rather than reporting red.
  let result;
  let msgId = 1;
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await cdp(ws, msgId++, "Runtime.evaluate", {
          expression:
            "new Promise(r => document.readyState === 'complete' ? r(1) : addEventListener('load', () => r(1), {once:true}))",
          awaitPromise: true,
        });
        const evald = await cdp(ws, msgId++, "Runtime.evaluate", {
          expression: PAGE_ASSERTION,
          awaitPromise: true,
          returnByValue: true,
        });
        result = evald.result?.value;
        break;
      } catch (err) {
        if (!/context was destroyed|Cannot find context/i.test(err.message)) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } finally {
    ws.close();
    await cleanup();
  }

  console.log(`probe target: ${URL_UNDER_TEST}`);

  if (!result) {
    console.error("FAIL — assertion returned nothing (page script threw?)");
    process.exit(1);
  }
  if (result.fatal) {
    console.error(`FAIL — ${result.fatal}`);
    process.exit(1);
  }

  for (const c of result.checks) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  }
  console.log("measured:", JSON.stringify(result.measured, null, 2));

  if (!result.ok) {
    console.error("\nPROBE FAILED");
    process.exit(1);
  }
  console.log("\nPROBE PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error(`probe could not run: ${err.message}`);
  process.exit(2);
});
