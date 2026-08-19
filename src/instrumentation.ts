/**
 * Next.js instrumentation: runs once when the server process boots. In cloud
 * mode (and only on the Node.js runtime) it starts the background scheduler that
 * runs scheduled queries and raises alerts. Self-hosted/desktop skip it.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DEPLOY_MODE !== "cloud") return;
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
