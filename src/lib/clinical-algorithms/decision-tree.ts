import { Dass21ScoreResult } from "./scorer";

export type ScreeningPathResult = "SELESAI_NORMAL" | "LANJUT_PHQ9" | "LANJUT_GAD7" | "SELESAI_WITH_WARNING";

/**
 * Executes the clinical routing logic based on DASS-21 severity profiles and medical priority.
 * 
 * Medical Priority Tie-breaker: Depression > Anxiety > Stress
 */
export function evaluateDecisionTree(dassResult: Dass21ScoreResult): ScreeningPathResult {
  const levelD = dassResult.depression.level;
  const levelA = dassResult.anxiety.level;
  const levelS = dassResult.stress.level;

  // If all are Level 0 (Normal)
  if (levelD === 0 && levelA === 0 && levelS === 0) {
    return "SELESAI_NORMAL";
  }

  // Find the highest severity level
  const maxLevel = Math.max(levelD, levelA, levelS);

  // Tie-breaker: Depression > Anxiety > Stress
  if (levelD === maxLevel) {
    return "LANJUT_PHQ9";
  } else if (levelA === maxLevel) {
    return "LANJUT_GAD7";
  } else {
    // Only Stress is the highest
    return "SELESAI_WITH_WARNING";
  }
}

/**
 * Checks for clinical Red Alert.
 * Triggered if PHQ-9 Question 9 (thoughts of self-harm or suicide) is scored >= 1.
 * 
 * @param phq9Answers Array of scores (0-3) for the 9 PHQ-9 items.
 */
export function checkRedAlert(phq9Answers: number[]): boolean {
  if (phq9Answers.length < 9) {
    return false;
  }
  // Q9 is at index 8 of PHQ-9 answers
  return phq9Answers[8] > 0;
}
