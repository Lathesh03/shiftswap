// Tier 1: deterministic, CI-blocking. The Claude client is a hand-rolled fake
// that returns scripted responses — no network call, no API key needed.
import { describe, it, expect, vi } from "vitest";
import { runAgentLoop, withRetry, type MessagesClient } from "@/lib/agent/loop";
import type Anthropic from "@anthropic-ai/sdk";

function textResponse(text: string): Anthropic.Message {
  return {
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
  } as Anthropic.Message;
}

function toolUseResponse(name: string, input: Record<string, unknown>, id = "tool_1"): Anthropic.Message {
  return {
    content: [{ type: "tool_use", id, name, input }],
    stop_reason: "tool_use",
  } as Anthropic.Message;
}

const baseOpts = {
  model: "claude-opus-5",
  system: "You are a test agent.",
  tools: [] as Anthropic.Tool[],
  userMessage: "do the thing",
};

describe("runAgentLoop", () => {
  it("returns final text immediately when the model doesn't call a tool", async () => {
    const create = vi.fn().mockResolvedValue(textResponse("No candidates found."));
    const client: MessagesClient = { messages: { create } };
    const executeTool = vi.fn();

    const result = await runAgentLoop({ ...baseOpts, client, executeTool });

    expect(result.finalText).toBe("No candidates found.");
    expect(result.steps).toHaveLength(0);
    expect(executeTool).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("executes a tool call, feeds the result back, and returns the model's follow-up text", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(toolUseResponse("check_labor_rules", { candidateId: "e2", swapId: "s1" }))
      .mockResolvedValueOnce(textResponse("Match proposed for e2."));
    const client: MessagesClient = { messages: { create } };
    const executeTool = vi.fn().mockResolvedValue({ allowed: true, reasons: [] });

    const result = await runAgentLoop({ ...baseOpts, client, executeTool });

    expect(executeTool).toHaveBeenCalledWith("check_labor_rules", { candidateId: "e2", swapId: "s1" });
    expect(result.steps).toEqual([
      { tool: "check_labor_rules", input: { candidateId: "e2", swapId: "s1" }, output: { allowed: true, reasons: [] } },
    ]);
    expect(result.finalText).toBe("Match proposed for e2.");

    // Second call's message history must include the tool_result fed back.
    // Note: `messages` is mutated in place across turns, so index into the
    // position we know was written before this call rather than trusting
    // "last" — later turns append further entries to the same array.
    const secondCallArgs = create.mock.calls[1][0];
    const toolResultMessage = secondCallArgs.messages[2];
    expect(toolResultMessage.role).toBe("user");
    expect(toolResultMessage.content[0].type).toBe("tool_result");
    expect(toolResultMessage.content[0].tool_use_id).toBe("tool_1");
  });

  it("stops after maxTurns even if the model keeps calling tools (the safety rail)", async () => {
    const create = vi.fn().mockResolvedValue(toolUseResponse("find_eligible_candidates", { swapId: "s1" }));
    const client: MessagesClient = { messages: { create } };
    const executeTool = vi.fn().mockResolvedValue({ eligible: [] });

    const result = await runAgentLoop({ ...baseOpts, client, executeTool, maxTurns: 3 });

    expect(create).toHaveBeenCalledTimes(3);
    expect(result.steps).toHaveLength(3);
    expect(result.finalText).toBe("Agent stopped: reached max turns.");
  });

  it("executes multiple tool_use blocks within a single turn", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        content: [
          { type: "tool_use", id: "a", name: "check_labor_rules", input: { candidateId: "e1" } },
          { type: "tool_use", id: "b", name: "check_labor_rules", input: { candidateId: "e2" } },
        ],
        stop_reason: "tool_use",
      } as unknown as Anthropic.Message)
      .mockResolvedValueOnce(textResponse("done"));
    const client: MessagesClient = { messages: { create } };
    const executeTool = vi.fn().mockResolvedValue({ allowed: true });

    const result = await runAgentLoop({ ...baseOpts, client, executeTool });

    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(result.steps).toHaveLength(2);
  });
});

describe("withRetry", () => {
  it("returns the result on the first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429"))
      .mockRejectedValueOnce(new Error("529"))
      .mockResolvedValueOnce("ok");

    await expect(withRetry(fn, 3)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error once retries are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("still failing"));
    await expect(withRetry(fn, 2)).rejects.toThrow("still failing");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
