import type { LangfuseSpan } from "@langfuse/tracing";
import type { MessagesClient, ToolExecutor } from "@/lib/agent/loop";

// Wraps a real Claude client so every turn becomes a Langfuse "generation"
// observation (model, messages, token usage) nested under `parentSpan`.
// Deliberately NOT baked into lib/agent/loop.ts — that module stays pure and
// vendor-free so evals/unit/loop.test.ts can keep testing it with a fake
// client and no tracing side effects.
export function tracedClient(client: MessagesClient, parentSpan: LangfuseSpan): MessagesClient {
  return {
    messages: {
      create: async (params) => {
        const generation = parentSpan.startObservation(
          "claude-turn",
          { model: params.model, input: params.messages },
          { asType: "generation" }
        );
        try {
          const response = await client.messages.create(params);
          generation.update({
            output: response.content,
            usageDetails: {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
            },
          });
          return response;
        } catch (err) {
          generation.update({ level: "ERROR", statusMessage: err instanceof Error ? err.message : String(err) });
          throw err;
        } finally {
          generation.end();
        }
      },
    },
  };
}

// Wraps a tool executor so every tool call becomes a Langfuse "tool"
// observation nested under `parentSpan`.
export function tracedExecuteTool(executeTool: ToolExecutor, parentSpan: LangfuseSpan): ToolExecutor {
  return async (name, input) => {
    const tool = parentSpan.startObservation(name, { input }, { asType: "tool" });
    try {
      const output = await executeTool(name, input);
      tool.update({ output });
      return output;
    } catch (err) {
      tool.update({ level: "ERROR", statusMessage: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      tool.end();
    }
  };
}
