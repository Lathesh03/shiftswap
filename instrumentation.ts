// Auto-loaded by Next.js before any other server code runs. NodeSDK isn't
// edge-compatible, so the actual init is gated to the nodejs runtime and
// deferred to a separate module.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
