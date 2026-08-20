import Link from "next/link";
import type { SwapWithContext } from "@/lib/dashboard";

const STATUS_LABEL: Record<string, string> = {
  requested: "Matching",
  matched: "Decision needed",
  approved: "Approved",
  applied: "Applied",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_PILL_CLASS: Record<string, string> = {
  requested: "text-ink-muted bg-card-sunken",
  matched: "text-accent-ink bg-accent-wash",
  approved: "text-success bg-success-wash",
  applied: "text-success bg-success-wash",
  rejected: "text-danger bg-danger-wash",
  cancelled: "text-ink-muted bg-card-sunken",
};

function formatShiftTime(shift: SwapWithContext["shift"]) {
  if (!shift) return "No shift on file";
  const start = new Date(shift.starts_at);
  const end = new Date(shift.ends_at);
  const day = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${startTime}–${endTime}`;
}

export default function SwapRow({ swap, highlight = false }: { swap: SwapWithContext; highlight?: boolean }) {
  const coverText =
    swap.status === "requested"
      ? "finding a match…"
      : swap.candidateName !== "—"
        ? `covered by ${swap.candidateName}`
        : "no cover found";

  return (
    <Link
      href={`/dashboard/${swap.id}`}
      className={`block rounded-2xl border bg-card p-4 transition hover:border-ink-faint ${
        highlight ? "border-accent/30 shadow-[var(--shadow-card)]" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {highlight && (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-bold text-accent-ink">
              !
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {swap.requesterName} → {coverText}
            </p>
            <p className="text-sm text-ink-muted">
              {formatShiftTime(swap.shift)} · {swap.requesterDepartment}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL_CLASS[swap.status]}`}>
          {STATUS_LABEL[swap.status]}
        </span>
      </div>
    </Link>
  );
}
