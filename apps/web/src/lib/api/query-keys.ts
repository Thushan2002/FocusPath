/**
 * React Query cache keys, built in one place so queries, optimistic updates and invalidations
 * can never drift apart. `all` keys are prefixes for invalidating every variant.
 */
export const queryKeys = {
  today: ["today"] as const,
  roadmap: ["roadmap"] as const,
  roadmapStatus: (roadmapId: string) => ["roadmap-status", roadmapId] as const,
  concepts: {
    all: ["concept"] as const,
    one: (conceptId: string | undefined) => ["concept", conceptId] as const,
  },
  exercises: (conceptId: string) => ["exercises", conceptId] as const,
  tutor: (conceptId: string) => ["tutor", conceptId] as const,
};
