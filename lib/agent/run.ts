import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { findEligibleCandidates, checkLaborRules, proposeMatch, searchPolicies } from "@/lib/scheduling/core";
import { runAgentLoop, type AgentResult } from "@/lib/agent/loop";

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
  {
    name: "search_policies",
    description:
      "Search company labor/scheduling policy for text relevant to a question. " +
      "Use this to justify any decision. Returns the most relevant policy passages with their source.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "What rule or situation to look up" } },
      required: ["query"],
    },
  },
];

// Dispatch a tool call to the guarded implementation.
async function runTool(supabase: SupabaseClient, name: string, input: Record<string, unknown>) {
  switch (name) {
    case "find_eligible_candidates": return await findEligibleCandidates(supabase, input.swapId as string);
    case "check_labor_rules":        return await checkLaborRules(supabase, input.candidateId as string, input.swapId as string);
    case "propose_match":            return await proposeMatch(supabase, input.swapId as string, input.candidateId as string);
    case "search_policies":          return await searchPolicies(supabase, input.query as string);
    default:                         return { error: `Unknown tool: ${name}` };
  }
}

const SYSTEM = `You are a shift-swap scheduling assistant.
Given a swap request, find eligible candidates, verify your chosen candidate with
check_labor_rules, then call propose_match for the best verified candidate.
Never propose a candidate you have not verified. If no candidate is eligible,
explain why and do NOT call propose_match.

When you reject a candidate or justify a match, first call search_policies with a
short query describing the rule in question. Base your reasoning on the returned
passages and cite the source name in your final explanation (e.g. "per labor_rules:
overlapping shifts"). Do not invent rules that aren't in the retrieved policy.`;

export type { AgentStep, AgentResult } from "@/lib/agent/loop";

export async function runMatchAgent(swapId: string): Promise<AgentResult> {
  const supabase = await createClient();
  return runAgentLoop({
    client: anthropic,
    model: MODEL,
    system: SYSTEM,
    tools,
    userMessage: `Find and propose a match for swap ${swapId}.`,
    executeTool: (name, input) => runTool(supabase, name, input),
    maxTurns: 6,
  });
}
