// Inner Ring Studio — offline desktop app.
//
// It bundles the Inner Ring Studio web app (Next.js standalone build) and runs
// it LOCALLY inside the app: the Electron main process spawns the server on a
// loopback port and opens a window to it. Everything runs on your machine —
// the encrypted vault is local, and database connections go straight from your
// machine to the DB. No dependency on any remote server.

const { app, BrowserWindow, ipcMain, dialog, utilityProcess } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");

let serverProc = null;
let mainWin = null;
let port = 0;
// While booting, the passphrase window closes before the main window exists;
// don't let that transient "no windows" state quit the app.
let booting = true;

// In a packaged app the studio build lives under resources/studio; in dev it's
// under ./resources/studio (populated by `npm run bundle-studio`).
function studioDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "studio")
    : path.join(__dirname, "..", "resources", "studio");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

function startServer(passphrase) {
  const env = {
    ...process.env,
    // Run the bundled Node server using Electron's own Node runtime, so the
    // packaged app needs no system Node install.
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    // Local, encrypted vault (overridable for testing); defaults to the app's
    // user-data directory.
    PMSQL_VAULT:
      process.env.PMSQL_VAULT || path.join(app.getPath("userData"), "vault.enc"),
    PMSQL_PASSPHRASE: passphrase,
    PMSQL_TZ: process.env.PMSQL_TZ || "Asia/Ulaanbaatar",
    // No app-level login on the local desktop app — it's your own machine.
  };
  delete env.PMSQL_AUTH_PASSWORD;

  // utilityProcess runs the bundled Node server as a managed child WITHOUT its
  // own dock icon (a raw spawn of the Electron binary shows up as a stray "exec"
  // app in the dock). ELECTRON_RUN_AS_NODE is unneeded here — utilityProcess is
  // already a Node runtime.
  delete env.ELECTRON_RUN_AS_NODE;
  serverProc = utilityProcess.fork(path.join(studioDir(), "server.js"), [], {
    env,
    cwd: studioDir(),
    stdio: "inherit",
    serviceName: "inner-ring-studio-server",
  });
  serverProc.on("exit", (code) => {
    if (code && code !== 0) {
      dialog.showErrorBox("Inner Ring Studio", `Local server exited (code ${code}).`);
    }
  });
}

function waitForReady(timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/local`, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("server timeout"));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

// Ask for the vault passphrase before the server starts.
function promptPassphrase() {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 420,
      height: 300,
      resizable: false,
      title: "Inner Ring Studio",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
      },
    });
    win.loadFile(path.join(__dirname, "passphrase.html"));
    ipcMain.once("passphrase:submit", (_e, value) => {
      win.close();
      resolve(value || "");
    });
    win.on("closed", () => resolve(""));
  });
}

// The vault passphrase can be stored locally (like an ssh key) so the app
// unlocks the synced vault automatically — no random string to type each launch.
// Resolution: PMSQL_PASSPHRASE env → passphrase file → interactive prompt.
// The file lives OUTSIDE the git-synced vault repo (in userData), so the secret
// never gets committed alongside the encrypted blob.
function readPassphraseFile() {
  const p =
    process.env.PMSQL_PASSPHRASE_FILE ||
    path.join(app.getPath("userData"), "passphrase");
  try {
    return (fs.readFileSync(p, "utf8").trim()) || "";
  } catch {
    return "";
  }
}

async function boot() {
  // PMSQL_PASSPHRASE (env) or a local passphrase file skips the prompt.
  const passphrase =
    process.env.PMSQL_PASSPHRASE ||
    readPassphraseFile() ||
    (await promptPassphrase());
  if (!passphrase) {
    app.quit();
    return;
  }
  port = await getFreePort();
  startServer(passphrase);
  try {
    await waitForReady();
  } catch {
    dialog.showErrorBox(
      "Inner Ring Studio",
      "The local server did not start. Check that the studio build is bundled."
    );
    app.quit();
    return;
  }
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Inner Ring Studio",
    webPreferences: { contextIsolation: true },
  });
  mainWin.loadURL(`http://127.0.0.1:${port}/local`);
  booting = false;
}

app.whenReady().then(boot);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) boot();
});

app.on("window-all-closed", () => {
  if (booting) return; // ignore the transient no-window state during startup
  if (serverProc) serverProc.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (serverProc) serverProc.kill();
});
