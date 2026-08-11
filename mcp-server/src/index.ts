import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  findEligibleCandidates,
  checkLaborRules,
  proposeMatch,
  searchPolicies,
} from "./core.js";

// No user session out here — service-role client. Privileged: local/server only.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const server = new McpServer({ name: "shiftswap-scheduler", version: "1.0.0" });

server.tool(
  "find_eligible_candidates",
  "List employees who could take the shift in the given swap.",
  { swapId: z.string().describe("The swap request id") },
  async ({ swapId }) => ({
    content: [{ type: "text", text: JSON.stringify(await findEligibleCandidates(supabase, swapId)) }],
  })
);

server.tool(
  "check_labor_rules",
  "Check whether a candidate may take the swap's shift. Returns allowed + reasons.",
  { candidateId: z.string(), swapId: z.string() },
  async ({ candidateId, swapId }) => ({
    content: [{ type: "text", text: JSON.stringify(await checkLaborRules(supabase, candidateId, swapId)) }],
  })
);

server.tool(
  "propose_match",
  "Record a verified candidate as the match. Re-validates rules and state.",
  { swapId: z.string(), candidateId: z.string() },
  async ({ swapId, candidateId }) => ({
    content: [{ type: "text", text: JSON.stringify(await proposeMatch(supabase, swapId, candidateId)) }],
  })
);

server.tool(
  "search_policies",
  "Search company policy for passages relevant to a question.",
  { query: z.string() },
  async ({ query }) => ({
    content: [{ type: "text", text: JSON.stringify(await searchPolicies(supabase, query)) }],
  })
);

await server.connect(new StdioServerTransport());
