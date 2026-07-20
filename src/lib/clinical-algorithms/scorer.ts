/**
 * Clinical Scoring and Severity Mapping Engines for KITADETEKSI
 * Pure functions only.
 */

export interface Dass21ScoreResult {
  depression: { score: number; label: string; level: number };
  anxiety: { score: number; label: string; level: number };
  stress: { score: number; label: string; level: number };
}

// DASS-21 item indices (1-based, as defined clinically)
// Depression: 3, 5, 10, 13, 16, 17, 21 -> 0-based indices: 2, 4, 9, 12, 15, 16, 20
const DEPRESSION_ITEMS = [2, 4, 9, 12, 15, 16, 20];

// Anxiety: 2, 4, 7, 9, 15, 19, 20 -> 0-based indices: 1, 3, 6, 8, 14, 18, 19
const ANXIETY_ITEMS = [1, 3, 6, 8, 14, 18, 19];

// Stress: 1, 6, 8, 11, 12, 14, 18 -> 0-based indices: 0, 5, 7, 10, 11, 13, 17
const STRESS_ITEMS = [0, 5, 7, 10, 11, 13, 17];

export function getDepressionCategory(score: number): { label: string; level: number } {
  if (score <= 9) return { label: "Normal", level: 0 };
  if (score <= 13) return { label: "Ringan", level: 1 };
  if (score <= 20) return { label: "Sedang", level: 2 };
  if (score <= 27) return { label: "Parah", level: 3 };
  return { label: "Sangat Parah", level: 4 };
}

export function getAnxietyCategory(score: number): { label: string; level: number } {
  if (score <= 7) return { label: "Normal", level: 0 };
  if (score <= 9) return { label: "Ringan", level: 1 };
  if (score <= 14) return { label: "Sedang", level: 2 };
  if (score <= 19) return { label: "Parah", level: 3 };
  return { label: "Sangat Parah", level: 4 };
}

export function getStressCategory(score: number): { label: string; level: number } {
  if (score <= 14) return { label: "Normal", level: 0 };
  if (score <= 18) return { label: "Ringan", level: 1 };
  if (score <= 25) return { label: "Sedang", level: 2 };
  if (score <= 33) return { label: "Parah", level: 3 };
  return { label: "Sangat Parah", level: 4 };
}

/**
 * Calculates final subscale scores for DASS-21 (Raw sum * 2) and maps to clinical severity.
 */
export function calculateDass21(answers: number[]): Dass21ScoreResult {
  if (answers.length < 21) {
    throw new Error("DASS-21 requires exactly 21 answers.");
  }

  // Calculate sum of raw scores for each category
  const depRaw = DEPRESSION_ITEMS.reduce((sum, idx) => sum + (answers[idx] || 0), 0);
  const anxRaw = ANXIETY_ITEMS.reduce((sum, idx) => sum + (answers[idx] || 0), 0);
  const strRaw = STRESS_ITEMS.reduce((sum, idx) => sum + (answers[idx] || 0), 0);

  // Multiply by 2 (Clinically mandatory for DASS-21 -> DASS-42 conversion)
  const depFinal = depRaw * 2;
  const anxFinal = anxRaw * 2;
  const strFinal = strRaw * 2;

  return {
    depression: {
      score: depFinal,
      ...getDepressionCategory(depFinal)
    },
    anxiety: {
      score: anxFinal,
      ...getAnxietyCategory(anxFinal)
    },
    stress: {
      score: strFinal,
      ...getStressCategory(strFinal)
    }
  };
}

/**
 * Calculates total score for PHQ-9 (Sum of all 9 items) and maps to clinical severity.
 */
export function calculatePhq9(answers: number[]): { score: number; label: string; level: number } {
  if (answers.length < 9) {
    throw new Error("PHQ-9 requires exactly 9 answers.");
  }

  const score = answers.reduce((sum, val) => sum + val, 0);

  if (score <= 4) return { score, label: "Minimal/Normal", level: 0 };
  if (score <= 9) return { score, label: "Ringan", level: 1 };
  if (score <= 14) return { score, label: "Sedang", level: 2 };
  if (score <= 19) return { score, label: "Sedang-Berat", level: 3 };
  return { score, label: "Berat", level: 4 };
}

/**
 * Calculates total score for GAD-7 (Sum of all 7 items) and maps to clinical severity.
 */
export function calculateGad7(answers: number[]): { score: number; label: string; level: number } {
  if (answers.length < 7) {
    throw new Error("GAD-7 requires exactly 7 answers.");
  }

  const score = answers.reduce((sum, val) => sum + val, 0);

  if (score <= 4) return { score, label: "Minimal/Normal", level: 0 };
  if (score <= 9) return { score, label: "Ringan", level: 1 };
  if (score <= 14) return { score, label: "Sedang", level: 2 };
  return { score, label: "Berat", level: 3 };
}
