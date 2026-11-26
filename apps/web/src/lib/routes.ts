/** In-app page paths. Use these instead of string templates so links stay consistent. */
export const paths = {
  today: "/today",
  roadmap: "/roadmap",
  onboarding: "/onboarding",
  roadmapGenerating: (roadmapId: string) => `/roadmap/generating?id=${roadmapId}`,
  focus: (conceptId: string) => `/focus/${conceptId}`,
  quiz: (assessmentId: string) => `/quiz/${assessmentId}`,
  results: (attemptId: string) => `/results/${attemptId}`,
} as const;
