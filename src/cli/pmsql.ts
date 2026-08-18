#!/usr/bin/env bun
/**
 * pmsql CLI — configure database connections (stored in an encrypted, syncable
 * vault) and launch the web workspace.
 *
 *   pmsql conn add sample-shop --host localhost --port 5434 --db shop --user shop
 *   pmsql conn ls
 *   pmsql conn rm sample-shop
 *   pmsql serve --port 3008
 *
 * The vault lives at ~/.config/pmsql/vault.enc (override with PMSQL_VAULT).
 * The master passphrase is read from PMSQL_PASSPHRASE, or prompted for
 * interactively when running in a terminal. Connection passwords are likewise
 * prompted (hidden) when not passed with --password.
 */
import { spawn } from "child_process";
import { parseArgs } from "util";
import { prompt, isInteractive } from "./prompt";
import {
  addConnection,
  listConnections,
  readVault,
  removeConnection,
  updateConnection,
  vaultPath,
  writeVault,
} from "../lib/vault";
import { commitConfig, linkRepo, status as configStatus, sync } from "../lib/config-repo";

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

const USAGE = `pmsql — database workspace CLI

Usage:
  pmsql conn add <name> --host <h> --port <p> [--db <d>] [--user <u>] [--password <pw>] [--ssl]
  pmsql conn ls
  pmsql conn rm <name>
  pmsql serve [--port <p>] [--host <h>]
  pmsql config link <repo-url>   store the encrypted vault in a git repo (multi-device)
  pmsql config status
  pmsql sync                     pull + push the vault to the config repo

Environment:
  PMSQL_PASSPHRASE   master passphrase that encrypts the vault
                     (prompted for interactively if unset)
  PMSQL_VAULT        vault file path (default ~/.config/pmsql/vault.enc)
`;

/**
 * Ensure PMSQL_PASSPHRASE is available: use the env var if set, otherwise prompt
 * (when interactive). Verifies it can decrypt an existing vault so a typo is
 * caught before we do anything. Sets process.env so spawned children inherit it.
 */
async function ensurePassphrase(): Promise<void> {
  const canVerify = (): boolean => {
    try {
      readVault();
      return true;
    } catch {
      return false;
    }
  };

  if (process.env.PMSQL_PASSPHRASE) {
    if (!canVerify()) {
      die("PMSQL_PASSPHRASE is set but cannot decrypt the existing vault.");
    }
    return;
  }

  if (!isInteractive()) {
    die(
      "PMSQL_PASSPHRASE is not set and no terminal is available to prompt. " +
        "Set the env var, e.g. `export PMSQL_PASSPHRASE=...`."
    );
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    process.env.PMSQL_PASSPHRASE = await prompt("Vault passphrase: ", {
      hidden: true,
    });
    if (canVerify()) return;
    console.error("  wrong passphrase, try again.");
    delete process.env.PMSQL_PASSPHRASE;
  }
  die("Failed to unlock the vault after 3 attempts.");
}

async function cmdConnAdd(args: string[]) {
  const name = args[0];
  if (!name || name.startsWith("-")) die("conn add requires a <name>");
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      host: { type: "string" },
      port: { type: "string" },
      db: { type: "string" },
      database: { type: "string" },
      user: { type: "string" },
      password: { type: "string" },
      ssl: { type: "boolean", default: false },
      folder: { type: "string" },
      timezone: { type: "string" },
    },
    allowPositionals: false,
  });

  if (!values.host) die("--host is required");
  if (!values.port) die("--port is required");

  await ensurePassphrase();

  // Prompt (hidden) for the DB password when not supplied on the command line,
  // so it never lands in shell history.
  let password = values.password;
  if (password === undefined && isInteractive()) {
    password = await prompt(`Password for ${values.user ?? "db"}: `, {
      hidden: true,
    });
    if (password === "") password = undefined;
  }

  const conn = addConnection({
    name,
    driver: "postgres",
    host: values.host,
    port: Number(values.port),
    database: values.database ?? values.db,
    user: values.user,
    password,
    ssl: Boolean(values.ssl),
    folder: values.folder,
    timezone: values.timezone,
  });
  commitConfig(`pmsql: add connection ${conn.name}`);
  console.log(`added connection "${conn.name}" (${conn.id})`);
  console.log(`  ${conn.user ?? ""}@${conn.host}:${conn.port}/${conn.database ?? ""}`);
  console.log(`  vault: ${vaultPath()}`);
  console.log(`  run \`pmsql sync\` to publish to the config repo`);
}

async function cmdConnLs() {
  await ensurePassphrase();
  const conns = listConnections();
  if (conns.length === 0) {
    console.log("no connections. add one with: pmsql conn add <name> --host ... --port ...");
    return;
  }
  for (const c of conns) {
    console.log(
      `${c.name}\t${c.driver}\t${c.user ?? ""}@${c.host}:${c.port}/${c.database ?? ""}${c.ssl ? "\tssl" : ""}\t(${c.id})`
    );
  }
}

async function cmdConnRm(args: string[]) {
  const name = args[0];
  if (!name) die("conn rm requires a <name>");
  await ensurePassphrase();
  const removed = removeConnection(name);
  if (removed) commitConfig(`pmsql: remove connection ${name}`);
  console.log(removed ? `removed "${name}" (run \`pmsql sync\` to publish)` : `no connection "${name}"`);
}

async function cmdPassphrase(args: string[]) {
  const action = args[0];
  if (action && action !== "change") {
    die(`unknown passphrase action "${action}". Try: change`);
  }
  const { values } = parseArgs({
    args: args.slice(action === "change" ? 1 : 0),
    options: { new: { type: "string" } },
    allowPositionals: false,
  });

  // Unlock with the current passphrase and decrypt the vault into memory.
  await ensurePassphrase();
  const data = readVault();

  // Obtain the new passphrase (flag for automation, else prompt twice).
  let next = values.new;
  if (next === undefined) {
    if (!isInteractive()) {
      die("no --new passphrase and no terminal to prompt.");
    }
    const p1 = await prompt("New passphrase: ", { hidden: true });
    const p2 = await prompt("Confirm new passphrase: ", { hidden: true });
    if (p1 !== p2) die("passphrases do not match");
    next = p1;
  }
  if (!next) die("new passphrase must not be empty");

  // Re-encrypt with the new passphrase.
  process.env.PMSQL_PASSPHRASE = next;
  writeVault(data);
  commitConfig("pmsql: rotate vault passphrase");
  console.log("passphrase changed. run `pmsql sync` to publish the re-encrypted vault.");
}

async function cmdConnSet(args: string[]) {
  const name = args[0];
  if (!name || name.startsWith("-")) die("conn set requires a <name>");
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      folder: { type: "string" },
      timezone: { type: "string" },
      host: { type: "string" },
      port: { type: "string" },
      db: { type: "string" },
      database: { type: "string" },
      user: { type: "string" },
      ssl: { type: "boolean" },
    },
    allowPositionals: false,
  });
  await ensurePassphrase();
  const conn = listConnections().find((c) => c.name === name || c.id === name);
  if (!conn) die(`no connection "${name}"`);

  const patch: Record<string, unknown> = {};
  if (values.folder !== undefined) patch.folder = values.folder;
  if (values.timezone !== undefined) patch.timezone = values.timezone;
  if (values.host !== undefined) patch.host = values.host;
  if (values.port !== undefined) patch.port = Number(values.port);
  if ((values.database ?? values.db) !== undefined)
    patch.database = values.database ?? values.db;
  if (values.user !== undefined) patch.user = values.user;
  if (values.ssl !== undefined) patch.ssl = values.ssl;

  updateConnection(conn.id, patch);
  commitConfig(`pmsql: update connection ${name}`);
  console.log(`updated "${name}" (run \`pmsql sync\` to publish)`);
}

function cmdConfig(args: string[]) {
  const action = args[0];
  if (action === "link") {
    const url = args[1];
    if (!url) die("config link requires a <repo-url>");
    console.log(linkRepo(url).message);
    return;
  }
  if (action === "status" || action === undefined) {
    console.log(configStatus());
    return;
  }
  die(`unknown config action "${action}". Try: link | status`);
}

function cmdSync() {
  const r = sync();
  console.log(r.message);
  if (!r.ok) process.exit(1);
}

async function cmdServe(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: "string", default: "3008" },
      host: { type: "string", default: "127.0.0.1" },
    },
    allowPositionals: false,
  });

  // Unlock the vault up front (prompting if needed) so the launched server
  // inherits PMSQL_PASSPHRASE and can resolve connections.
  await ensurePassphrase();

  const mode = process.env.NODE_ENV === "production" ? "start" : "dev";
  console.log(`pmsql serve → next ${mode} on http://${values.host}:${values.port}`);
  console.log(`  vault: ${vaultPath()} (unlocked)`);
  const child = spawn(
    "bun",
    ["x", "next", mode, "-p", String(values.port), "-H", String(values.host)],
    { stdio: "inherit", env: process.env }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main() {
  const [, , cmd, sub, ...rest] = process.argv;

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(USAGE);
    return;
  }

  if (cmd === "conn") {
    if (sub === "add") return cmdConnAdd(rest);
    if (sub === "ls" || sub === "list") return cmdConnLs();
    if (sub === "rm" || sub === "remove") return cmdConnRm(rest);
    if (sub === "set" || sub === "edit") return cmdConnSet(rest);
    die(`unknown conn subcommand "${sub ?? ""}". Try: add | ls | rm | set`);
  }

  if (cmd === "config") return cmdConfig([sub, ...rest].filter(Boolean) as string[]);
  if (cmd === "passphrase") return cmdPassphrase([sub, ...rest].filter(Boolean) as string[]);
  if (cmd === "sync") return cmdSync();
  if (cmd === "serve") return cmdServe([sub, ...rest].filter(Boolean) as string[]);

  die(`unknown command "${cmd}". Run \`pmsql help\`.`);
}

main();
