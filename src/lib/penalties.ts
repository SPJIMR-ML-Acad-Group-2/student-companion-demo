/**
 * Absenteeism Penalty Rules (from SPJIMR Table 5)
 *
 * Credits → Sessions:  1cr=9, 2cr=18, 3cr=26, 4cr=35
 * L1 (1-level downgrade):  2, 4, 5, 5
 * L2 (2-level downgrade):  4, 6, 6, 7
 * L3 (F grade):            5, 8, 8, 9
 *
 * Grades: A+, A, B+, B, C+, C, D, F
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
  absences: number;
  thresholds: { L1: number; L2: number; L3: number };
}

export function getPenaltyInfo(credits: number, absences: number): PenaltyInfo {
  const thresholds = PENALTY_THRESHOLDS[credits] || PENALTY_THRESHOLDS[3];

  if (absences >= thresholds.L3) {
    return { level: "L3", label: "F Grade", description: `${absences} absences → automatic F grade`, absences, thresholds };
  }
  if (absences >= thresholds.L2) {
    return { level: "L2", label: "2-Level Downgrade", description: `${absences} absences → one letter downgrade (e.g., A→B)`, absences, thresholds };
  }
  if (absences >= thresholds.L1) {
    return { level: "L1", label: "1-Level Downgrade", description: `${absences} absences → one level downgrade (e.g., A+→A)`, absences, thresholds };
  }
  return { level: "none", label: "No Penalty", description: `${absences} absences — within allowed limit`, absences, thresholds };
}

/**
 * Apply penalty to a grade string.
 * Returns the downgraded grade.
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
