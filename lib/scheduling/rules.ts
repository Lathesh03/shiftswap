// Pure scheduling rules — no DB, no network, no Date.now() ambiguity beyond
// the ISO strings passed in. These are the functions Tier 1 evals exercise
// directly, in memory, with no live services.

export type RawShift = {
  id: string;
  employee_id: string | null;
  starts_at: string;
  ends_at: string;
};

export type RawEmployee = {
  id: string;
  name: string;
  position: string;
  department: string;
};

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

function exclusionReasons(
  candidateId: string,
  requesterId: string | null,
  shift: RawShift,
  candidateShifts: RawShift[]
): string[] {
  const reasons: string[] = [];
  if (candidateId === requesterId) reasons.push("Candidate is the requester.");

  const clash = candidateShifts.some((s) => overlaps(s.starts_at, s.ends_at, shift.starts_at, shift.ends_at));
  if (clash) reasons.push("Candidate already works an overlapping shift.");

  return reasons;
}

// Who could take `shift`, given the full employee and shift rosters — eligible
// or not, with the reason(s) each excluded candidate was ruled out. Powers
// both the eligible-candidates tool and the dashboard's "who else was
// considered, and why" view.
export function evaluateCandidates(
  shift: RawShift,
  employees: RawEmployee[],
  allShifts: RawShift[],
  requesterId: string | null
): (RawEmployee & { eligible: boolean; reasons: string[] })[] {
  return employees.map((e) => {
    const candidateShifts = allShifts.filter((s) => s.employee_id === e.id);
    const reasons = exclusionReasons(e.id, requesterId, shift, candidateShifts);
    return { ...e, eligible: reasons.length === 0, reasons };
  });
}

// May `candidateId` take `shift`, given their existing shifts and who requested it?
export function checkCandidate(
  candidateId: string,
  requesterId: string | null,
  shift: RawShift,
  candidateShifts: RawShift[]
): { allowed: boolean; reasons: string[] } {
  const reasons = exclusionReasons(candidateId, requesterId, shift, candidateShifts);
  return { allowed: reasons.length === 0, reasons };
}
