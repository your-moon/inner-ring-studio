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
  vaultPath,
} from "../lib/vault";

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
  });
  console.log(`added connection "${conn.name}" (${conn.id})`);
  console.log(`  ${conn.user ?? ""}@${conn.host}:${conn.port}/${conn.database ?? ""}`);
  console.log(`  vault: ${vaultPath()}`);
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
  console.log(removeConnection(name) ? `removed "${name}"` : `no connection "${name}"`);
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
    die(`unknown conn subcommand "${sub ?? ""}". Try: add | ls | rm`);
  }

  if (cmd === "serve") return cmdServe([sub, ...rest].filter(Boolean) as string[]);

  die(`unknown command "${cmd}". Run \`pmsql help\`.`);
}

main();
