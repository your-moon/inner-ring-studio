/**
 * Next.js instrumentation: runs once when the server process boots. In cloud
 * mode it starts the background scheduler that runs scheduled queries and raises
 * alerts. Self-hosted/desktop skip it.
 *
 * The scheduler import is nested inside the `NEXT_RUNTIME === "nodejs"` guard so
 * that the Edge build (which also compiles this file) dead-code-eliminates it —
 * otherwise webpack tries to bundle the Node-only DB clients (http/zlib/…) for
 * edge and the build fails.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DEPLOY_MODE === "cloud") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
