import { pgEnum } from "drizzle-orm/pg-core";

export const levelEnum = pgEnum("learner_level", ["beginner", "intermediate", "advanced"]);
export const struggleEnum = pgEnum("struggle", [
  "inconsistency",
  "what_next",
  "jumping",
  "theory_to_projects",
]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "paused", "archived"]);
export const roadmapStatusEnum = pgEnum("roadmap_status", [
  "generating",
  "ready",
  "failed",
  "superseded",
]);
export const evidenceKindEnum = pgEnum("evidence_kind", ["activity", "knowledge", "practical"]);
export const taskKindEnum = pgEnum("task_kind", [
  "learn",
  "explain",
  "coding",
  "mini_project",
  "assessment",
  "revision",
]);
export const taskCompletionEnum = pgEnum("task_completion", ["manual", "evidence"]);
export const assessmentKindEnum = pgEnum("assessment_kind", ["concept_quiz", "recall"]);
export const tutorRoleEnum = pgEnum("tutor_role", ["user", "assistant"]);
export const revisionKindEnum = pgEnum("revision_kind", ["practice", "recall", "apply", "retention"]);
export const recommendationKindEnum = pgEnum("recommendation_kind", [
  "learn",
  "practice",
  "revise",
  "advance",
]);
export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "active",
  "accepted",
  "dismissed",
  "superseded",
]);
export const focusChoiceEnum = pgEnum("focus_choice", ["keep_focus", "ask_tutor", "change_plan"]);
