// Tier 1: deterministic, CI-blocking. No DB, no network, no LLM.
import { describe, it, expect } from "vitest";
import { deriveState, assertTransition } from "@/lib/swaps";
import { overlaps, eligibleCandidates, checkCandidate, type RawShift, type RawEmployee } from "@/lib/scheduling/rules";
import type { SwapEvent } from "@/lib/types";

describe("state machine (lib/swaps.ts)", () => {
  it("derives status by folding events in order", () => {
    const events: SwapEvent[] = [
      { type: "requested", shiftId: "s1", requestedBy: "e1", at: "2026-01-01T00:00:00Z" },
      { type: "matched", candidateId: "e2", at: "2026-01-01T01:00:00Z" },
    ];
    const state = deriveState(events);
    expect(state.status).toBe("matched");
    expect(state.candidateId).toBe("e2");
    expect(state.shiftId).toBe("s1");
  });

  it("allows the legal next transitions from each status", () => {
    const requested: SwapEvent[] = [
      { type: "requested", shiftId: "s1", requestedBy: "e1", at: "2026-01-01T00:00:00Z" },
    ];
    expect(assertTransition(requested, "matched").ok).toBe(true);
    expect(assertTransition(requested, "rejected").ok).toBe(true);
    expect(assertTransition(requested, "cancelled").ok).toBe(true);
  });

  it("rejects illegal transitions, e.g. approving a swap that was never matched", () => {
    const requested: SwapEvent[] = [
      { type: "requested", shiftId: "s1", requestedBy: "e1", at: "2026-01-01T00:00:00Z" },
    ];
    const result = assertTransition(requested, "approved");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("requested");
  });

  it("rejects any event once a swap has reached a terminal state", () => {
    const applied: SwapEvent[] = [
      { type: "requested", shiftId: "s1", requestedBy: "e1", at: "2026-01-01T00:00:00Z" },
      { type: "matched", candidateId: "e2", at: "2026-01-01T01:00:00Z" },
      { type: "approved", approvedBy: "mgr", at: "2026-01-01T02:00:00Z" },
      { type: "applied", at: "2026-01-01T03:00:00Z" },
    ];
    expect(assertTransition(applied, "matched").ok).toBe(false);
    expect(assertTransition(applied, "cancelled").ok).toBe(false);
  });

  it("requires the first event of a swap to be 'requested'", () => {
    const result = assertTransition([], "matched");
    expect(result.ok).toBe(false);
  });
});

describe("overlaps()", () => {
  it("detects overlapping ranges", () => {
    expect(overlaps("2026-01-01T09:00:00Z", "2026-01-01T17:00:00Z", "2026-01-01T16:00:00Z", "2026-01-02T00:00:00Z")).toBe(true);
  });

  it("does not flag back-to-back shifts as overlapping", () => {
    expect(overlaps("2026-01-01T09:00:00Z", "2026-01-01T17:00:00Z", "2026-01-01T17:00:00Z", "2026-01-02T01:00:00Z")).toBe(false);
  });

  it("does not flag disjoint ranges", () => {
    expect(overlaps("2026-01-01T09:00:00Z", "2026-01-01T17:00:00Z", "2026-01-02T09:00:00Z", "2026-01-02T17:00:00Z")).toBe(false);
  });
});

describe("eligibleCandidates()", () => {
  const shift: RawShift = { id: "shift-1", employee_id: null, starts_at: "2026-01-01T09:00:00Z", ends_at: "2026-01-01T17:00:00Z" };
  const employees: RawEmployee[] = [
    { id: "e1", name: "Requester", position: "Barista", department: "Cafe" },
    { id: "e2", name: "Free", position: "Barista", department: "Cafe" },
    { id: "e3", name: "Busy", position: "Barista", department: "Cafe" },
  ];
  const allShifts: RawShift[] = [
    { id: "shift-2", employee_id: "e3", starts_at: "2026-01-01T10:00:00Z", ends_at: "2026-01-01T18:00:00Z" },
  ];

  it("excludes the requester", () => {
    const result = eligibleCandidates(shift, employees, allShifts, "e1");
    expect(result.map((e) => e.id)).not.toContain("e1");
  });

  it("excludes anyone with an overlapping shift", () => {
    const result = eligibleCandidates(shift, employees, allShifts, "e1");
    expect(result.map((e) => e.id)).not.toContain("e3");
    expect(result.map((e) => e.id)).toContain("e2");
  });
});

describe("checkCandidate()", () => {
  const shift: RawShift = { id: "shift-1", employee_id: null, starts_at: "2026-01-01T09:00:00Z", ends_at: "2026-01-01T17:00:00Z" };

  it("rejects the requester as their own candidate", () => {
    const result = checkCandidate("e1", "e1", shift, []);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("Candidate is the requester.");
  });

  it("rejects a candidate with an overlapping shift", () => {
    const candidateShifts: RawShift[] = [{ id: "s2", employee_id: "e2", starts_at: "2026-01-01T08:00:00Z", ends_at: "2026-01-01T12:00:00Z" }];
    const result = checkCandidate("e2", "e1", shift, candidateShifts);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("Candidate already works an overlapping shift.");
  });

  it("allows a free, unrelated candidate", () => {
    const result = checkCandidate("e2", "e1", shift, []);
    expect(result.allowed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});
