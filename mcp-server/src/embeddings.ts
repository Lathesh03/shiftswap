// Copied from ../../lib/embeddings.ts (self-contained, no import changes needed).
const VOYAGE_MODEL = "voyage-4-lite";

type VoyageInputType = "query" | "document";

async function embed(text: string, inputType: VoyageInputType): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    throw new Error(`Voyage embeddings request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

// Use for policy chunks going INTO the index.
export function embedDocument(text: string): Promise<number[]> {
  return embed(text, "document");
}

// Use for the agent's search query, at retrieval time.
export function embedQuery(text: string): Promise<number[]> {
  return embed(text, "query");
}
