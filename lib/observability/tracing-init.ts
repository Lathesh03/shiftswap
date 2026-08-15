import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Shared by both the Next.js app (via instrumentation.node.ts) and the live
// eval harness (via evals/live/setup-env.ts) — one init path, one flush path.
let spanProcessor: LangfuseSpanProcessor | undefined;

export function initTracing(): void {
  if (spanProcessor) return; // already initialized this process
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return; // not configured — tracing calls stay inert no-ops

  spanProcessor = new LangfuseSpanProcessor({
    // Vercel functions can freeze right after the response is sent, so batch
    // export risks losing spans; immediate export trades a little latency for
    // not silently dropping traces. Also fine for the eval harness's short-lived process.
    exportMode: "immediate",
  });
  const sdk = new NodeSDK({ spanProcessors: [spanProcessor] });
  sdk.start();
}

export async function flushTracing(): Promise<void> {
  await spanProcessor?.forceFlush();
}
