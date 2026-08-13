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

// Who could take `shift`, given the full employee and shift rosters, excluding
// the requester and anyone whose existing shift overlaps it.
export function eligibleCandidates(
  shift: RawShift,
  employees: RawEmployee[],
  allShifts: RawShift[],
  requesterId: string | null
) {
  return employees
    .filter((e) => e.id !== requesterId)
    .filter(
      (e) =>
        !allShifts.some(
          (s) => s.employee_id === e.id && overlaps(s.starts_at, s.ends_at, shift.starts_at, shift.ends_at)
        )
    );
}

// May `candidateId` take `shift`, given their existing shifts and who requested it?
export function checkCandidate(
  candidateId: string,
  requesterId: string | null,
  shift: RawShift,
  candidateShifts: RawShift[]
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (candidateId === requesterId) reasons.push("Candidate is the requester.");

  const clash = candidateShifts.some((s) => overlaps(s.starts_at, s.ends_at, shift.starts_at, shift.ends_at));
  if (clash) reasons.push("Candidate already works an overlapping shift.");

  return { allowed: reasons.length === 0, reasons };
}
