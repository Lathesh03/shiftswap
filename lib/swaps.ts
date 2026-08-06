import type { SwapEvent, SwapState, SwapStatus, Result } from "@/lib/types";

// Apply a single event to the running state.
function applyEvent(state: SwapState, event: SwapEvent): SwapState {
  switch (event.type) {
    case "requested":
      return { ...state, status: "requested",
        shiftId: event.shiftId, requestedBy: event.requestedBy };
    case "matched":
      return { ...state, status: "matched", candidateId: event.candidateId };
    case "approved":
      return { ...state, status: "approved", approvedBy: event.approvedBy };
    case "applied":
      return { ...state, status: "applied" };
    case "rejected":
      return { ...state, status: "rejected", rejectionReason: event.reason };
    case "cancelled":
      return { ...state, status: "cancelled" };
    default: {
      // Exhaustiveness check: if you add an event type to the union and
      // forget to handle it here, TS makes THIS line a compile error.
      // This is the single biggest payoff of discriminated unions.
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

// Derive current state by folding the whole history.
export function deriveState(events: SwapEvent[]): SwapState {
  const initial: SwapState = {
    status: "requested",
    shiftId: null,
    requestedBy: null,
    candidateId: null,
    approvedBy: null,
    rejectionReason: null,
    history: events,
  };
  return events.reduce(applyEvent, initial);
}

// Which event types are legal from each status.
const ALLOWED_TRANSITIONS: Record<SwapStatus, SwapEvent["type"][]> = {
  requested: ["matched", "rejected", "cancelled"],
  matched: ["approved", "rejected", "cancelled"],
  approved: ["applied", "rejected", "cancelled"],
  applied: [],   // terminal
  rejected: [],  // terminal
  cancelled: [], // terminal
};

// Returns ok:true if `next` is a legal event given the current history.
export function assertTransition(
  events: SwapEvent[],
  next: SwapEvent["type"]
): Result<true> {
  if (events.length === 0) {
    return next === "requested"
      ? { ok: true, data: true }
      : { ok: false, error: "A swap must start with a 'requested' event." };
  }
  if (next === "requested") {
    return { ok: false, error: "This swap already exists." };
  }
  const { status } = deriveState(events);
  return ALLOWED_TRANSITIONS[status].includes(next)
    ? { ok: true, data: true }
    : { ok: false, error: `Cannot '${next}' a swap that is '${status}'.` };
}

type SwapEventRow = {
  swap_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export function rowToEvent(row: SwapEventRow): SwapEvent {
  const at = row.created_at;
  const p = row.payload;
  switch (row.type) {
    case "requested":
      return { type: "requested", shiftId: String(p.shiftId), requestedBy: String(p.requestedBy), at };
    case "matched":
      return { type: "matched", candidateId: String(p.candidateId), at };
    case "approved":
      return { type: "approved", approvedBy: String(p.approvedBy), at };
    case "applied":
      return { type: "applied", at };
    case "rejected":
      return { type: "rejected", reason: String(p.reason), at };
    case "cancelled":
      return { type: "cancelled", at };
    default:
      throw new Error(`Unknown event type in DB: ${row.type}`);
  }
}
