import { addDays } from "./dates";

export interface StreakState {
  current: number;
  longest: number;
  lastEvidenceDate: string | null;
}

/** A streak day is a day (learner's timezone) with at least one piece of meaningful evidence. */
export function applyEvidenceDay(state: StreakState, day: string): StreakState {
  if (state.lastEvidenceDate === day) return state;
  const continues = state.lastEvidenceDate !== null && addDays(state.lastEvidenceDate, 1) === day;
  const current = continues ? state.current + 1 : 1;
  return { current, longest: Math.max(state.longest, current), lastEvidenceDate: day };
}

/** What to show today: a streak survives until the end of the day after its last evidence. */
export function visibleStreak(state: StreakState, today: string): number {
  if (!state.lastEvidenceDate) return 0;
  if (state.lastEvidenceDate === today || addDays(state.lastEvidenceDate, 1) === today) {
    return state.current;
  }
  return 0;
}
