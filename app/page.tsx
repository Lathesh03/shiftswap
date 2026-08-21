import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ShiftSwap — The model proposes, the manager decides",
  description:
    "An event-sourced shift-swap scheduler with a guarded, policy-citing AI matching agent and a human-in-the-loop operations dashboard.",
};

const FEATURES = [
  {
    title: "Nothing is a black box",
    body: "Every match shows who else was considered and why they were ruled out — grounded in cited policy text, not invented rules.",
  },
  {
    title: "Guarded, not just prompted",
    body: "Every action the agent takes re-validates against the same rules a human would have to follow, server-side, every single time.",
  },
  {
    title: "An audit trail that can't lie",
    body: "Every request, match, approval, and override is an immutable event. Nothing is ever silently overwritten.",
  },
  {
    title: "Watched in production",
    body: "Deterministic tests block every push; live evals and full request tracing catch what tests alone can't.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-20 px-6 py-16 sm:py-24">
      <section className="flex flex-col gap-6">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-ink">
          AI-assisted shift scheduling
        </span>
        <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          The model proposes. The manager decides.
        </h1>
        <p className="max-w-prose text-lg text-ink-muted">
          ShiftSwap replaces ad-hoc shift-swap chaos with an event-sourced audit trail and a
          Claude-powered agent that finds a cover, cites the actual policy it&apos;s applying, and
          can never make an irreversible call without a human.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-ink"
          >
            Sign in
          </Link>
          <a
            href="https://github.com/Lathesh03/shiftswap"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-focus"
          >
            View source ↗
          </a>
        </div>
      </section>

      <section aria-label="Example AI recommendation" className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <span className="text-xs font-bold uppercase tracking-wide text-accent-ink">AI recommendation</span>
        <p className="mt-3 max-w-prose text-ink">
          Ben is the only eligible candidate with no overlapping shift and hours under this
          week&apos;s cap. Manager approval is still required before this is applied.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Grounded in{" "}
          <code className="rounded border border-border bg-card-sunken px-1.5 py-0.5 font-mono text-xs">
            labor_rules: overlapping shifts
          </code>{" "}
          ·{" "}
          <code className="rounded border border-border bg-card-sunken px-1.5 py-0.5 font-mono text-xs">
            labor_rules: manager approval
          </code>
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-card-sunken px-3 py-2 text-sm">
            <span className="font-medium text-ink">Ben Okafor</span>
            <span className="text-xs font-semibold text-success">proposed</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-card-sunken px-3 py-2 text-sm opacity-75">
            <span className="font-medium text-ink">Marcus Lee</span>
            <span className="text-xs text-danger">excluded · overlaps 16:00–22:00 shift</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-card-sunken px-3 py-2 text-sm opacity-75">
            <span className="font-medium text-ink">Ana Reyes</span>
            <span className="text-xs text-danger">excluded · is the requester</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col gap-2">
            <h2 className="font-bold text-ink">{f.title}</h2>
            <p className="text-sm text-ink-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-ink-faint">
        <span>Next.js · Supabase · Claude API · Voyage AI · MCP · Langfuse</span>
        <a
          href="https://github.com/Lathesh03/shiftswap"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-focus"
        >
          Source on GitHub ↗
        </a>
      </footer>
    </main>
  );
}
