# ShiftSwap MCP Server

An [MCP](https://modelcontextprotocol.io) server exposing ShiftSwap's shift-swap scheduling tools — the same guarded logic the web app's agent uses, over the standard protocol so any MCP host (Claude Desktop, Cursor, another agent) can drive it.

## What it exposes

Four tools, backed by `../lib/scheduling/core.ts`'s logic (duplicated here — see [Why the code is duplicated](#why-the-code-is-duplicated)):

| Tool | Kind | What it does |
|---|---|---|
| `find_eligible_candidates` | read-only | Lists employees who could take a swap's shift (excludes the requester and anyone with an overlapping shift) |
| `check_labor_rules` | read-only | Checks whether a specific candidate may take the shift, returns `{ allowed, reasons }` |
| `search_policies` | read-only, RAG | Semantic search over the company's labor policy (pgvector + Voyage embeddings), returns cited passages |
| `propose_match` | **action, guarded** | Records a match — re-validates labor rules *and* the state-machine transition itself, regardless of what the caller (human or model) believes it already checked |

`propose_match` is the important one: it doesn't trust the caller. An MCP client can't force an illegal match any more than the web app's own buttons can — the same guard from Week 3 runs here too.

## Version choice: MCP SDK v1

This server is built on `@modelcontextprotocol/sdk` **v1** (currently `1.30.0`), pinned exactly in `package.json`. A separate `@modelcontextprotocol/server` package (v2, per the 2026-07-28 spec) exists but is only days old at time of writing. v1 is stable, extensively documented, and works with every current MCP client. If migrating later, treat it as a deliberate version bump, not a drive-by dependency update.

## Running it

```bash
npm install
npm run build   # tsc -> build/index.js
```

Set three environment variables before running (never commit these, never expose them to a browser):

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # privileged — see below
VOYAGE_API_KEY=...
```

Then run directly:
```bash
npm start
```

Or validate it in isolation first with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) — always do this before blaming a client for a problem that's actually a schema bug:
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VOYAGE_API_KEY=... \
  npx @modelcontextprotocol/inspector node build/index.js
```

### Wiring into Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "shiftswap": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js"],
      "env": {
        "SUPABASE_URL": "https://<project>.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "…",
        "VOYAGE_API_KEY": "…"
      }
    }
  }
}
```
Restart Claude Desktop and ask it to find a match for a swap — it'll drive the real scheduling system through MCP.

## Security: the service-role key

This server runs **outside** any user session — there's no logged-in browser to derive a Supabase auth token from. It authenticates as `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses Row Level Security entirely**. Treat it exactly like a password:

- Never commit it (`.env` is gitignored in this folder)
- Never put it in a `NEXT_PUBLIC_` variable or anywhere a browser could read it
- It belongs here, in the ingestion script (`../scripts/ingest-policies.ts`), and nowhere else in this project

## Why the code is duplicated

`core.ts`, `swaps.ts`, `types.ts`, and `embeddings.ts` in this folder are copies of the equivalents in `../lib/`, with import paths adjusted to relative `.js`-extension ESM imports (required by this project's `moduleResolution: Node16`). The Next.js app uses the `@/` path alias and Next-specific module resolution; this server is a separate Node process with neither. Properly sharing the code would mean a monorepo/workspace setup — reasonable for production, unnecessary complexity for a learning build. This is a known, deliberate trade-off, not an oversight: if `core.ts` changes in the main app, the copy here needs to be updated by hand.

## Deployment

This server is **not** part of the Vercel deployment — it runs locally or wherever you choose to self-host it. The web app and this server are independent consumers of the same Supabase database and policy index.
