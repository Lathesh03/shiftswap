import Anthropic from "@anthropic-ai/sdk";
import { findEligibleCandidates, checkLaborRules, proposeMatch } from "./tools";

const MODEL = "claude-opus-5";
const anthropic = new Anthropic();

// Tool schemas the model sees. Descriptions matter — they're the model's only
// documentation. Be precise about when each should be called.
const tools: Anthropic.Tool[] = [
  {
    name: "find_eligible_candidates",
    description:
      "List employees who could take the shift in the given swap. Excludes the requester and anyone with an overlapping shift. Call this first.",
    input_schema: {
      type: "object",
      properties: { swapId: { type: "string" } },
      required: ["swapId"],
    },
  },
  {
    name: "check_labor_rules",
    description:
      "Check whether a specific candidate may take the swap's shift. Returns { allowed, reasons }. Call before proposing.",
    input_schema: {
      type: "object",
      properties: { candidateId: { type: "string" }, swapId: { type: "string" } },
      required: ["candidateId", "swapId"],
    },
  },
  {
    name: "propose_match",
    description:
      "Record the chosen candidate as the match. Only call after check_labor_rules returned allowed: true.",
    input_schema: {
      type: "object",
      properties: { swapId: { type: "string" }, candidateId: { type: "string" } },
      required: ["swapId", "candidateId"],
    },
  },
];

// Dispatch a tool call to the guarded implementation.
async function runTool(name: string, input: Record<string, any>) {
  switch (name) {
    case "find_eligible_candidates": return await findEligibleCandidates(input.swapId);
    case "check_labor_rules":        return await checkLaborRules(input.candidateId, input.swapId);
    case "propose_match":            return await proposeMatch(input.swapId, input.candidateId);
    default:                         return { error: `Unknown tool: ${name}` };
  }
}

// Retry wrapper for transient API failures (network, 429, 529).
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (err) { lastErr = err; await new Promise((r) => setTimeout(r, 500 * (i + 1))); }
  }
  throw lastErr;
}

const SYSTEM = `You are a shift-swap scheduling assistant.
Given a swap request, find eligible candidates, verify your chosen candidate with
check_labor_rules, then call propose_match for the best verified candidate.
Never propose a candidate you have not verified. If no candidate is eligible,
explain why and do NOT call propose_match.`;

export type AgentStep = { tool: string; input: unknown; output: unknown };
export type AgentResult = { finalText: string; steps: AgentStep[] };

export async function runMatchAgent(swapId: string): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Find and propose a match for swap ${swapId}.` },
  ];
  const steps: AgentStep[] = [];
  const MAX_TURNS = 6; // safety rail: agents must terminate.

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await withRetry(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM,
        tools,
        messages,
      })
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
      const output = await runTool(block.name, block.input as Record<string, any>);
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
