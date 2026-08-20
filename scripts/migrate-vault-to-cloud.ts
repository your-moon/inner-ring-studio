/**
 * One-shot: create (or reuse) a cloud account and sync every connection from the
 * local encrypted vault into it. DB passwords are read from the vault and posted
 * straight to the cloud API — they are never printed. Only the account email,
 * the account password (so the user can sign in), and connection NAMES are shown.
 *
 * Run:
 *   PMSQL_PASSPHRASE=... PMSQL_VAULT=~/.config/pmsql/vault.enc \
 *   CLOUD=https://cloud.carrot-soft.tech EMAIL=you@example.com ACCOUNT_PW=... \
 *   bun run scripts/migrate-vault-to-cloud.ts
 */
import { readVault } from "../src/lib/vault";

const CLOUD = process.env.CLOUD ?? "https://cloud.carrot-soft.tech";
const EMAIL = (process.env.EMAIL ?? "").trim().toLowerCase();
const PW = process.env.ACCOUNT_PW ?? "";

if (!EMAIL || !PW) {
  console.error("EMAIL and ACCOUNT_PW are required.");
  process.exit(1);
}

function sessionCookie(res: Response): string | null {
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    const m = c.match(/^(irs_session=[^;]+)/);
    if (m) return m[1];
  }
  return null;
}

async function main() {
  // 1. Read the vault (passwords included) — stays in memory, never logged.
  const conns = readVault().connections;
  console.log(`Vault: ${conns.length} connection(s) — ${conns.map((c) => c.name).join(", ")}`);

  // 2. Create the account (or reuse if it already exists), then log in cleanly.
  let created = false;
  const su = await fetch(`${CLOUD}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  if (su.ok) created = true;
  else {
    const j = await su.json().catch(() => ({}));
    console.log(`signup: ${su.status} (${j.error ?? "exists"}) — will log in instead`);
  }

  const li = await fetch(`${CLOUD}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  const cookie = sessionCookie(li);
  if (!li.ok || !cookie) {
    console.error(`login failed: ${li.status} ${await li.text().catch(() => "")}`);
    process.exit(1);
  }
  console.log(`account: ${created ? "created" : "existing"} + signed in ✓`);

  // 3. Which connections already exist in the cloud account (idempotent sync).
  const dbRes = await fetch(`${CLOUD}/api/db`, { headers: { Cookie: cookie } });
  const existing = new Set<string>(
    ((await dbRes.json().catch(() => ({}))).connections ?? []).map((c: { name: string }) => c.name)
  );

  // 4. Push each vault connection up (skip ones already present by name).
  let added = 0;
  for (const c of conns) {
    if (existing.has(c.name)) {
      console.log(`  = ${c.name} (already in cloud, skipped)`);
      continue;
    }
    const res = await fetch(`${CLOUD}/api/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: c.name,
        driver: c.driver,
        host: c.host,
        port: c.port,
        database: c.database,
        user: c.user,
        password: c.password, // read from vault; goes straight to the API, not stdout
        ssl: c.ssl ?? false,
        readOnly: c.readOnly ?? false,
        folder: c.folder,
        timezone: c.timezone,
      }),
    });
    if (res.ok) {
      added++;
      console.log(`  + ${c.name} (${c.driver}) → added`);
    } else {
      const j = await res.json().catch(() => ({}));
      console.log(`  ! ${c.name}: ${res.status} ${j.error ?? ""}`);
    }
  }

  console.log(`\nDone. ${added} connection(s) synced into ${EMAIL} on ${CLOUD}.`);
}

main().catch((e) => {
  console.error("migration failed:", e.message);
  process.exit(1);
});
