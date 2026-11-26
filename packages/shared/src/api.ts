/** Request bodies accepted by apps/web route handlers. Every write is parsed with these. */
import { z } from "zod";
import { FOCUS_CHOICES, LEVELS, STRUGGLES, TARGET_MONTHS_OPTIONS, TUTOR_MODES } from "./enums";

export const OnboardingInputSchema = z.object({
  goal: z.string().trim().min(3, "Tell us your goal").max(120),
  level: z.enum(LEVELS),
  priorKnowledge: z.string().trim().max(300).default(""),
  dailyMinutes: z.number().int().min(15).max(480),
  targetMonths: z
    .number()
    .int()
    .refine((m) => (TARGET_MONTHS_OPTIONS as readonly number[]).includes(m), "3, 6 or 12 months"),
  struggle: z.enum(STRUGGLES),
  timezone: z.string().min(1).max(64).default("UTC"),
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const SetFocusInputSchema = z.object({ conceptId: z.uuid() });

export const TaskPatchSchema = z.object({ done: z.boolean() });

export const StudySessionStartSchema = z.object({ conceptId: z.uuid() });
export const StudySessionUpdateSchema = z.object({
  activeSeconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 12),
  ended: z.boolean().default(false),
});

export const TestResultSchema = z.object({
  name: z.string().max(80),
  passed: z.boolean(),
  message: z.string().max(2000).nullable(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

export const SubmissionInputSchema = z.object({
  code: z.string().min(1).max(20_000),
  results: z.array(TestResultSchema).max(20),
});

export const HintInputSchema = z.object({
  currentCode: z.string().max(20_000),
  lastError: z.string().max(2000).nullable(),
});

export const TutorMessageInputSchema = z.object({
  conceptId: z.uuid(),
  exerciseId: z.uuid().nullable().default(null),
  message: z.string().trim().min(1).max(2000),
  mode: z.enum(TUTOR_MODES).default("free"),
});

export const ExplanationInputSchema = z.object({
  conceptId: z.uuid(),
  text: z.string().trim().min(20, "Write at least a couple of sentences").max(4000),
});

export const FocusEventInputSchema = z.object({
  conceptId: z.uuid(),
  targetTopic: z.string().trim().min(1).max(120),
  choice: z.enum(FOCUS_CHOICES),
});

export const SwitchCheckInputSchema = z.object({
  conceptId: z.uuid(),
  targetTopic: z.string().trim().min(1).max(120),
});

export const AttemptInputSchema = z.object({
  /** questionId → chosen option index */
  answers: z.record(z.uuid(), z.number().int().min(0).max(3)),
});

export const ProfileUpdateSchema = z.object({
  dailyMinutes: z.number().int().min(15).max(480).optional(),
  targetMonths: z.number().int().optional(),
  timezone: z.string().min(1).max(64).optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
