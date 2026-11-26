/**
 * Response types shared between the server (DAL) and the browser.
 *
 * Type-only re-exports: they are erased at compile time, so no server code reaches the client
 * bundle. Client components import view types from here — never from `@/lib/dal/*` directly —
 * which keeps this file the one seam between the two sides.
 */
export type { AssessmentView, ResultsView } from "../dal/assessment";
export type { ExerciseView, HintsResult, SubmissionResult } from "../dal/exercises";
export type { ExplanationResult } from "../dal/explanations";
export type { SwitchCheck } from "../dal/focus-guard";
export type { TodayView } from "../dal/plan";
export type { RecommendationView } from "../dal/recommendations";
export type { RevisionView } from "../dal/revisions";
export type { ConceptDetail, ConceptNode, ModuleNode, RoadmapView } from "../dal/roadmap";
export type { TutorMessageView } from "../dal/tutor";

export interface RoadmapStatus {
  id: string;
  status: "generating" | "ready" | "failed" | "superseded";
  error: string | null;
  goalId: string;
}

export interface Created {
  id: string;
}
