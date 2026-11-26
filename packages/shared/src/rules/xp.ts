/**
 * XP is only awarded for meaningful evidence (product rule 7). Opening the app, ticking an
 * activity task or reading earns nothing.
 */
export const XP_RULES = {
  quiz_passed: 50,
  exercise_solved: 20,
  exercise_solved_with_answer_hint: 5,
  explanation_accepted: 15,
} as const;
export type XpSource = keyof typeof XP_RULES;

/** Explanations scoring at least this (0–1) count as accepted. */
export const EXPLANATION_ACCEPT_SCORE = 0.6;

/** Level n starts at 100·(n−1)² XP: L1 0, L2 100, L3 400, L4 900, L5 1600 … */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function levelProgress(xp: number): { level: number; floor: number; next: number } {
  const level = levelForXp(xp);
  return { level, floor: 100 * (level - 1) ** 2, next: 100 * level ** 2 };
}
