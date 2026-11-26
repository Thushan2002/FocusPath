/**
 * Contracts for services/ai (FastAPI). The Pydantic models in services/ai/app/schemas are the
 * source of truth; these Zod schemas re-validate every response on the Next.js side.
 * JSON is camelCase on the wire.
 */
import { z } from "zod";
import {
  RECOMMENDATION_KINDS,
  type CONCEPT_STATUSES,
  type LEVELS,
  type STRUGGLES,
  type TUTOR_MODES,
} from "./enums";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case key");

// ---------- Roadmap generation ----------

export const RoadmapTaskTemplateSchema = z.object({
  kind: z.enum(["learn", "explain", "coding", "mini_project", "assessment"]),
  title: z.string().min(3).max(140),
  minutes: z.number().int().min(5).max(180),
});

export const RoadmapConceptSchema = z.object({
  key: slug,
  title: z.string().min(2).max(100),
  summary: z.string().min(5).max(400),
  estMinutes: z.number().int().min(15).max(1200),
  prerequisites: z.array(slug),
  subtopics: z
    .array(z.object({ key: slug, title: z.string().min(2).max(100) }))
    .min(2)
    .max(8),
  criteria: z.object({
    quizPassPct: z.number().int().min(50).max(100),
    exercisesRequired: z.number().int().min(1).max(5),
    explanationRequired: z.boolean(),
  }),
  taskTemplates: z.array(RoadmapTaskTemplateSchema).min(3).max(6),
});

export const RoadmapModuleSchema = z.object({
  key: slug,
  title: z.string().min(2).max(100),
  milestone: z.string().min(5).max(200),
  estWeeks: z.number().int().min(1).max(12),
  concepts: z.array(RoadmapConceptSchema).min(1).max(8),
});

export const RoadmapDraftSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(5).max(600),
  modules: z.array(RoadmapModuleSchema).min(1).max(10),
});
export type RoadmapDraft = z.infer<typeof RoadmapDraftSchema>;

export interface RoadmapGenerateRequest {
  goal: string;
  level: (typeof LEVELS)[number];
  priorKnowledge: string;
  dailyMinutes: number;
  targetMonths: number;
  struggle: (typeof STRUGGLES)[number];
}

// ---------- Assessments ----------

export const GeneratedQuestionSchema = z.object({
  subtopicKey: slug,
  prompt: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  rationale: z.string().min(5),
});
export const GeneratedAssessmentSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(3).max(20),
});
export type GeneratedAssessment = z.infer<typeof GeneratedAssessmentSchema>;

export interface ConceptContext {
  key: string;
  title: string;
  summary: string;
  subtopics: { key: string; title: string }[];
}

export interface AssessmentGenerateRequest {
  concept: ConceptContext;
  level: string;
  weakSubtopicKeys: string[];
  count: number;
}

// ---------- Exercises ----------

/** A test is a Python call expression compared against an expected Python literal. */
export const ExerciseTestSchema = z.object({
  name: z.string().min(1).max(80),
  call: z.string().min(1).max(400),
  expected: z.string().min(1).max(400),
});
export type ExerciseTest = z.infer<typeof ExerciseTestSchema>;

export const GeneratedExerciseSchema = z.object({
  subtopicKey: slug,
  title: z.string().min(3).max(100),
  prompt: z.string().min(10),
  starterCode: z.string().min(1),
  tests: z.array(ExerciseTestSchema).min(1).max(8),
  solution: z.string().min(1),
  isProject: z.boolean(),
});
export const GeneratedExercisesSchema = z.object({
  exercises: z.array(GeneratedExerciseSchema).min(1).max(6),
});
export type GeneratedExercise = z.infer<typeof GeneratedExerciseSchema>;

export interface ExerciseGenerateRequest {
  concept: ConceptContext;
  level: string;
  count: number;
  includeProject: boolean;
  recentMistakes: string[];
}

// ---------- Tutor ----------

export interface LearnerContext {
  goal: string;
  level: string;
  currentConcept: string;
  weakAreas: string[];
  recentMistakes: string[];
}

export const HintResponseSchema = z.object({
  level: z.number().int().min(1).max(3),
  hint: z.string().min(1),
  revealsAnswer: z.boolean(),
});
export type HintResponse = z.infer<typeof HintResponseSchema>;

export interface HintRequest {
  learner: LearnerContext;
  exercise: { title: string; prompt: string; starterCode: string; solution: string };
  level: number;
  previousHints: string[];
  currentCode: string;
  lastError: string | null;
}

export const TutorBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("code"), code: z.string(), language: z.string() }),
]);
export type TutorBlock = z.infer<typeof TutorBlockSchema>;

export const TutorReplySchema = z.object({
  blocks: z.array(TutorBlockSchema).min(1),
  followups: z.array(z.string()).max(3),
});
export type TutorReply = z.infer<typeof TutorReplySchema>;

export interface TutorReplyRequest {
  learner: LearnerContext;
  concept: ConceptContext;
  exercise: { title: string; prompt: string } | null;
  history: { role: "user" | "assistant"; text: string }[];
  message: string;
  mode: (typeof TUTOR_MODES)[number];
}

// ---------- Explanations ----------

export const ExplanationEvaluationSchema = z.object({
  score: z.number().min(0).max(1),
  rubric: z.object({
    accuracy: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
    ownWords: z.number().min(0).max(1),
  }),
  feedback: z.string(),
  misconceptions: z.array(z.string()),
});
export type ExplanationEvaluation = z.infer<typeof ExplanationEvaluationSchema>;

export interface ExplanationEvaluateRequest {
  concept: ConceptContext;
  level: string;
  text: string;
}

// ---------- Mastery (deterministic) ----------

export interface MasteryRequest {
  now: string;
  passMark: number;
  exercisesRequired: number;
  subtopicKeys: string[];
  evidence: {
    quiz: { at: string; score: number; bySubtopic: Record<string, number> }[];
    exercises: { at: string; subtopicKey: string | null; solvedWithoutFinalHint: boolean }[];
    explanations: { at: string; score: number }[];
  };
}

const unit = z.number().min(0).max(1);
export const MasteryResultSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  components: z.object({ quiz: unit, practical: unit, explanation: unit }),
  counts: z.object({
    quiz: z.number().int(),
    exercises: z.number().int(),
    explanations: z.number().int(),
  }),
  perSubtopic: z.array(
    z.object({ subtopicKey: z.string(), score: z.number().min(0).max(100), passed: z.boolean() }),
  ),
  calcVersion: z.string(),
});
export type MasteryResult = z.infer<typeof MasteryResultSchema>;

// ---------- Revision scheduling (deterministic) ----------

export interface RevisionScheduleRequest {
  now: string;
  learnedAt: string;
  conceptTitle: string;
  masteryScore: number;
  passMark: number;
  weakSubtopics: { key: string; title: string }[];
}

export const RevisionItemDraftSchema = z.object({
  dueAt: z.string(),
  intervalDays: z.number().int().min(1),
  kind: z.enum(["practice", "recall", "apply", "retention"]),
  subtopicKey: z.string().nullable(),
  title: z.string(),
  reason: z.string().min(5),
  minutes: z.number().int(),
});
export const RevisionScheduleSchema = z.object({
  items: z.array(RevisionItemDraftSchema),
  schedulerVersion: z.string(),
});
export type RevisionSchedule = z.infer<typeof RevisionScheduleSchema>;

// ---------- Recommendations (deterministic) ----------

export interface RecommendationRequest {
  now: string;
  passMark: number;
  focusConceptKey: string | null;
  concepts: {
    key: string;
    title: string;
    status: (typeof CONCEPT_STATUSES)[number];
    mastery: number | null;
    lastLearnedAt: string | null;
  }[];
  weakSubtopics: { conceptKey: string; key: string; title: string; score: number }[];
  dueRevisions: {
    id: string;
    conceptKey: string;
    title: string;
    dueAt: string;
    minutes: number;
    kind: string;
  }[];
}

export const RecommendationSchema = z.object({
  kind: z.enum(RECOMMENDATION_KINDS),
  conceptKey: z.string(),
  title: z.string().min(3),
  detail: z.string(),
  reason: z.string().min(10),
  estMinutes: z.number().int().min(1),
  revisionId: z.string().nullable(),
});
export type RecommendationDraft = z.infer<typeof RecommendationSchema>;
