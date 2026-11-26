import { MAX_HINT_LEVEL } from "../enums";

/** The final hint level reveals the answer; a solve after it doesn't count as "solved alone". */
export function usedAnswerHint(maxHintLevelUsed: number): boolean {
  return maxHintLevelUsed >= MAX_HINT_LEVEL;
}

/**
 * Keep the first item for each key, in input order. Used for "first solve of each exercise is the
 * evidence; later re-solves don't stack" — callers pass rows sorted oldest-first.
 */
export function firstPerKey<T, K>(items: Iterable<T>, keyOf: (item: T) => K): T[] {
  const seen = new Map<K, T>();
  for (const item of items) {
    const k = keyOf(item);
    if (!seen.has(k)) seen.set(k, item);
  }
  return [...seen.values()];
}
