/**
 * Absenteeism Penalty Rules (from SPJIMR Table 5)
 *
 * Credits → Sessions:  1cr=9, 2cr=18, 3cr=26, 4cr=35
 * L1 (1-level downgrade):  2, 4, 5, 5
 * L2 (2-level downgrade):  4, 6, 6, 7
 * L3 (F grade):            5, 8, 8, 9
 *
 * Late rule: 2 Lates = 1 Absence (for penalty calculation)
 */

export const CREDIT_SESSIONS: Record<number, number> = {
  1: 9,
  2: 18,
  3: 26,
  4: 35,
};

export const PENALTY_THRESHOLDS: Record<number, { L1: number; L2: number; L3: number }> = {
  1: { L1: 2, L2: 4, L3: 5 },
  2: { L1: 4, L2: 6, L3: 8 },
  3: { L1: 5, L2: 6, L3: 8 },
  4: { L1: 5, L2: 7, L3: 9 },
};

export const GRADE_LEVELS = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

export interface PenaltyInfo {
  level: "none" | "L1" | "L2" | "L3";
  label: string;
  description: string;
  effectiveAbsences: number;
  absences: number;
  lates: number;
  thresholds: { L1: number; L2: number; L3: number };
}

/**
 * 2 Lates = 1 Absence for penalty purposes.
 */
export function getEffectiveAbsences(absences: number, lates: number): number {
  return absences + Math.floor(lates / 2);
}

export function getPenaltyInfo(credits: number, absences: number, lates: number = 0): PenaltyInfo {
  const thresholds = PENALTY_THRESHOLDS[credits] || PENALTY_THRESHOLDS[3];
  const effective = getEffectiveAbsences(absences, lates);

  if (effective >= thresholds.L3) {
    return { level: "L3", label: "F Grade", description: `${effective} eff. absences (${absences}AB + ${lates}LT) → F grade`, effectiveAbsences: effective, absences, lates, thresholds };
  }
  if (effective >= thresholds.L2) {
    return { level: "L2", label: "2-Level Downgrade", description: `${effective} eff. absences → 2-level downgrade`, effectiveAbsences: effective, absences, lates, thresholds };
  }
  if (effective >= thresholds.L1) {
    return { level: "L1", label: "1-Level Downgrade", description: `${effective} eff. absences → 1-level downgrade`, effectiveAbsences: effective, absences, lates, thresholds };
  }
  return { level: "none", label: "No Penalty", description: `${effective} eff. absences — within limit`, effectiveAbsences: effective, absences, lates, thresholds };
}

/**
 * Apply penalty to a grade string.
 */
export function applyPenalty(grade: string, penaltyLevel: "none" | "L1" | "L2" | "L3"): string {
  if (penaltyLevel === "none") return grade;
  if (penaltyLevel === "L3") return "F";

  const idx = GRADE_LEVELS.indexOf(grade);
  if (idx === -1) return grade;

  const steps = penaltyLevel === "L1" ? 1 : 2;
  const newIdx = Math.min(idx + steps, GRADE_LEVELS.length - 1);
  return GRADE_LEVELS[newIdx];
}
