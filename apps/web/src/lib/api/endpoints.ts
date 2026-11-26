import type { FocusChoice, OnboardingInput, TestResult, TutorMode } from "@focuspath/shared";
import { apiFetch } from "./client";
import type {
  AssessmentView,
  ConceptDetail,
  Created,
  ExerciseView,
  ExplanationResult,
  HintsResult,
  RoadmapStatus,
  RoadmapView,
  SubmissionResult,
  SwitchCheck,
  TodayView,
  TutorMessageView,
} from "./contracts";

/**
 * Typed client for every /api/v1 endpoint, grouped by resource. Components call these instead of
 * building URLs, so a route change touches one file and every call site stays type-checked.
 */
export const endpoints = {
  today: {
    get: () => apiFetch<TodayView>("/today"),
  },
  tasks: {
    setDone: (taskId: string, done: boolean) =>
      apiFetch(`/tasks/${taskId}`, { method: "PATCH", json: { done } }),
  },
  focus: {
    set: (conceptId: string) =>
      apiFetch<{ planId: string }>("/focus", { method: "POST", json: { conceptId } }),
  },
  roadmap: {
    get: () => apiFetch<RoadmapView>("/roadmap"),
    status: (roadmapId: string) => apiFetch<RoadmapStatus>(`/roadmaps/${roadmapId}/status`),
    regenerate: (goalId: string) =>
      apiFetch<{ roadmapId: string }>(`/goals/${goalId}/roadmap/regenerate`, { method: "POST" }),
  },
  onboarding: {
    submit: (input: OnboardingInput) =>
      apiFetch<{ roadmapId: string }>("/onboarding", { method: "POST", json: input }),
  },
  concepts: {
    get: (conceptId: string) => apiFetch<ConceptDetail>(`/concepts/${conceptId}`),
    exercises: (conceptId: string) =>
      apiFetch<{ exercises: ExerciseView[] }>(`/concepts/${conceptId}/exercises`).then(
        (r) => r.exercises,
      ),
    createQuiz: (conceptId: string) =>
      apiFetch<Created>(`/concepts/${conceptId}/assessments`, { method: "POST" }),
  },
  exercises: {
    submit: (exerciseId: string, code: string, results: TestResult[]) =>
      apiFetch<SubmissionResult>(`/exercises/${exerciseId}/submissions`, {
        method: "POST",
        json: { code, results },
      }),
    hint: (exerciseId: string, currentCode: string, lastError: string | null) =>
      apiFetch<HintsResult>(`/exercises/${exerciseId}/hints`, {
        method: "POST",
        json: { currentCode, lastError },
      }),
  },
  assessments: {
    get: (assessmentId: string) => apiFetch<AssessmentView>(`/assessments/${assessmentId}`),
    submit: (assessmentId: string, answers: Record<string, number>) =>
      apiFetch<{ attemptId: string }>(`/assessments/${assessmentId}/attempts`, {
        method: "POST",
        json: { answers },
      }),
  },
  revisions: {
    start: (revisionId: string) =>
      apiFetch<Created>(`/revisions/${revisionId}/start`, { method: "POST" }),
  },
  explanations: {
    submit: (conceptId: string, text: string) =>
      apiFetch<ExplanationResult>("/explanations", { method: "POST", json: { conceptId, text } }),
  },
  tutor: {
    history: (conceptId: string) =>
      apiFetch<{ messages: TutorMessageView[] }>(
        `/tutor/messages?conceptId=${encodeURIComponent(conceptId)}`,
      ).then((r) => r.messages),
    send: (input: {
      conceptId: string;
      exerciseId: string | null;
      message: string;
      mode: TutorMode;
    }) => apiFetch<TutorMessageView>("/tutor/messages", { method: "POST", json: input }),
  },
  focusGuard: {
    check: (conceptId: string, targetTopic: string) =>
      apiFetch<SwitchCheck>("/focus-events/check", {
        method: "POST",
        json: { conceptId, targetTopic },
      }),
    record: (conceptId: string, targetTopic: string, choice: FocusChoice) =>
      apiFetch("/focus-events", { method: "POST", json: { conceptId, targetTopic, choice } }),
  },
  studySessions: {
    start: (conceptId: string) =>
      apiFetch<Created>("/study-sessions", { method: "POST", json: { conceptId } }),
    /** `keepalive` so the final sync survives page unload. */
    update: (sessionId: string, activeSeconds: number, ended: boolean) =>
      apiFetch(`/study-sessions/${sessionId}`, {
        method: "PATCH",
        json: { activeSeconds, ended },
        keepalive: true,
      }),
  },
} as const;
