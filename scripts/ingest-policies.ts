import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { embedDocument } from "../lib/embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // privileged — keep it safe
);

// Naive chunker: split on blank lines (one rule per chunk here).
function chunk(text: string): string[] {
  return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const dir = "policies";
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const source = file.replace(/\.md$/, "");

    // Idempotent: clear this source's old chunks before re-ingesting.
    const { error: delErr } = await supabase.from("policy_chunks").delete().eq("source", source);
    if (delErr) console.error("delete failed for", source, delErr.message);

    const chunks = chunk(readFileSync(join(dir, file), "utf8"));
    for (const content of chunks) {
      const embedding = await embedDocument(content);
      const { error } = await supabase
        .from("policy_chunks")
        .insert({ source, content, embedding });
      if (error) console.error(source, error.message);
      else console.log("ingested:", content.slice(0, 50), "…");
    }
  }
  console.log("done.");
}

main();
