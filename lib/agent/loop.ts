import type Anthropic from "@anthropic-ai/sdk";

// The loop mechanics, decoupled from Anthropic's own client and from what a
// tool actually does. This is what evals/unit/loop.test.ts exercises with a
// fake client and a fake tool executor — no network, no DB, no LLM.

export type AgentStep = { tool: string; input: unknown; output: unknown };
export type AgentResult = { finalText: string; steps: AgentStep[] };

// The slice of the Anthropic SDK client the loop actually calls. Narrow on
// purpose so tests can pass a minimal fake instead of a real client.
export type MessagesClient = {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      system: string;
      tools: Anthropic.Tool[];
      messages: Anthropic.MessageParam[];
    }) => Promise<Anthropic.Message>;
  };
};

export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<unknown>;

// Retry wrapper for transient API failures (network, 429, 529).
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (err) { lastErr = err; await new Promise((r) => setTimeout(r, 500 * (i + 1))); }
  }
  throw lastErr;
}

export async function runAgentLoop(opts: {
  client: MessagesClient;
  model: string;
  system: string;
  tools: Anthropic.Tool[];
  userMessage: string;
  executeTool: ToolExecutor;
  maxTurns?: number;
}): Promise<AgentResult> {
  const { client, model, system, tools, userMessage, executeTool, maxTurns = 6 } = opts;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const steps: AgentStep[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await withRetry(() =>
      client.messages.create({ model, max_tokens: 4096, system, tools, messages })
    );

    messages.push({ role: "assistant", content: response.content });

    // No tool call — the agent is done; return its text.
    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { finalText: text, steps };
    }

    // Execute each tool call, collect results, feed them back.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const output = await executeTool(block.name, block.input as Record<string, unknown>);
      steps.push({ tool: block.name, input: block.input, output });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return { finalText: "Agent stopped: reached max turns.", steps };
}
