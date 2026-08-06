import type { SwapEvent, SwapState } from "@/lib/types";

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
