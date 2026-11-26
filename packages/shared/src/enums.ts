export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_OPTIONS: { value: Level; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "New to most of this, or only know the basics" },
  {
    value: "intermediate",
    label: "Intermediate",
    desc: "Built small things, gaps in fundamentals",
  },
  { value: "advanced", label: "Advanced", desc: "Comfortable — want depth and real projects" },
];

export const STRUGGLES = ["inconsistency", "what_next", "jumping", "theory_to_projects"] as const;
export type Struggle = (typeof STRUGGLES)[number];

export const STRUGGLE_LABELS: Record<Struggle, string> = {
  inconsistency: "Inconsistency & forgetting concepts",
  what_next: "Not knowing what to learn next",
  jumping: "Jumping between technologies",
  theory_to_projects: "Turning theory into projects",
};

export const DAILY_MINUTES_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
  { value: 120, label: "2 h" },
  { value: 180, label: "3 h" },
  { value: 240, label: "4 h+" },
] as const;

export const TARGET_MONTHS_OPTIONS = [3, 6, 12] as const;

export const GOAL_SUGGESTIONS = [
  "Become an AI Engineer",
  "Full-Stack Developer",
  "DSA with Python",
  "Backend with Node.js",
  "Production AI apps",
] as const;

/** The three kinds of evidence. Kept separate everywhere (product rule 1). */
export const EVIDENCE_KINDS = ["activity", "knowledge", "practical"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_LABELS: Record<EvidenceKind, string> = {
  activity: "Activity",
  knowledge: "Knowledge",
  practical: "Practical",
};

export const TASK_KINDS = [
  "learn",
  "explain",
  "coding",
  "mini_project",
  "assessment",
  "revision",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  learn: "Read + video",
  explain: "Explain in your own words",
  coding: "Coding",
  mini_project: "Mini-project",
  assessment: "Assessment",
  revision: "Revision",
};

/**
 * Evidence kind is derived from the task kind, never chosen freely, so a task can't
 * claim to be practical evidence when it isn't.
 */
export const EVIDENCE_FOR_TASK_KIND: Record<TaskKind, EvidenceKind> = {
  learn: "activity",
  explain: "knowledge",
  coding: "practical",
  mini_project: "practical",
  assessment: "knowledge",
  revision: "knowledge",
};

/** Only activity tasks can be ticked by hand; the rest complete when their evidence lands. */
export function isManuallyCompletable(kind: TaskKind): boolean {
  return EVIDENCE_FOR_TASK_KIND[kind] === "activity";
}

export const CONCEPT_STATUSES = ["mastered", "in_progress", "up_next", "locked"] as const;
export type ConceptStatus = (typeof CONCEPT_STATUSES)[number];

export const CONCEPT_STATUS_LABELS: Record<ConceptStatus, string> = {
  mastered: "Mastered",
  in_progress: "In progress",
  up_next: "Up next",
  locked: "Locked",
};

export const FOCUS_CHOICES = ["keep_focus", "ask_tutor", "change_plan"] as const;
export type FocusChoice = (typeof FOCUS_CHOICES)[number];

export const RECOMMENDATION_KINDS = ["learn", "practice", "revise", "advance"] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const TUTOR_MODES = ["free", "simpler", "example", "quiz"] as const;
export type TutorMode = (typeof TUTOR_MODES)[number];

/** Mastery rule v1 (product rule 2). Mirrored in services/ai/app/domain/mastery.py. */
export const MASTERY = {
  calcVersion: "rule-v1",
  passMark: 70,
  weights: { quiz: 0.4, practical: 0.4, explanation: 0.2 },
  halfLifeDays: 14,
} as const;

/** The last hint level reveals the answer; a solve after it doesn't count as "solved alone". */
export const MAX_HINT_LEVEL = 3;

/**
 * Fallbacks used when a concept has no stored completion criteria or a learner has no profile yet.
 * Kept in one place so every module agrees on the same defaults.
 */
export const DEFAULTS = {
  level: "beginner" as Level,
  timezone: "UTC",
  exercisesRequired: 3,
  explanationRequired: true,
} as const;
