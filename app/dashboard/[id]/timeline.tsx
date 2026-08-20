import type { SwapEvent } from "@/lib/types";

const EVENT_LABEL: Record<SwapEvent["type"], string> = {
  requested: "Swap requested",
  matched: "Match proposed",
  approved: "Approved",
  applied: "Applied to the schedule",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function describeEvent(event: SwapEvent, directory: Record<string, string>): string {
  switch (event.type) {
    case "requested":
      return `${directory[event.requestedBy] ?? "Someone"} asked to give up this shift.`;
    case "matched":
      return `Proposed cover: ${directory[event.candidateId] ?? "unknown employee"}.`;
    case "approved":
      return `Approved by ${directory[event.approvedBy] ?? "a manager"}.`;
    case "applied":
      return "The swap took effect on the schedule.";
    case "rejected":
      return event.reason ? `Reason: ${event.reason}` : "No reason given.";
    case "cancelled":
      return "The request was withdrawn.";
  }
}

export default function Timeline({
  history,
  directory,
}: {
  history: SwapEvent[];
  directory: Record<string, string>;
}) {
  return (
    <ol className="flex flex-col gap-4">
      {history.map((event, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-faint" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink">{EVENT_LABEL[event.type]}</p>
            <p className="text-sm text-ink-muted">{describeEvent(event, directory)}</p>
            <p className="text-xs text-ink-faint">
              {new Date(event.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
