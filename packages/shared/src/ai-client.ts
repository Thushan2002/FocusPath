/**
 * Server-to-server client for services/ai. Import only from server code (route handlers,
 * the worker) — the secret must never reach a browser bundle.
 */
import { z } from "zod";
import {
  ExplanationEvaluationSchema,
  GeneratedAssessmentSchema,
  GeneratedExercisesSchema,
  HintResponseSchema,
  MasteryResultSchema,
  RecommendationSchema,
  RevisionScheduleSchema,
  RoadmapDraftSchema,
  TutorReplySchema,
  type AssessmentGenerateRequest,
  type ExerciseGenerateRequest,
  type ExplanationEvaluateRequest,
  type HintRequest,
  type MasteryRequest,
  type RecommendationRequest,
  type RevisionScheduleRequest,
  type RoadmapGenerateRequest,
  type TutorReplyRequest,
} from "./ai";

export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export interface AiClientOptions {
  baseUrl: string;
  secret: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

const RoadmapResponseSchema = z.object({
  roadmap: RoadmapDraftSchema,
  model: z.string(),
  promptVersion: z.string(),
});

export function createAiClient(opts: AiClientOptions) {
  const doFetch = opts.fetch ?? fetch;

  async function post<S extends z.ZodType>(path: string, body: unknown, schema: S, timeoutMs?: number): Promise<z.infer<S>> {
    let res: Response;
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-secret": opts.secret },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs ?? opts.timeoutMs ?? 60_000),
      });
    } catch (err) {
      throw new AiServiceError(`AI service unreachable: ${(err as Error).message}`, 503, true);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AiServiceError(`AI service ${path} failed (${res.status}): ${text.slice(0, 300)}`, res.status, res.status >= 500 || res.status === 429);
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      throw new AiServiceError(`AI service ${path} returned an invalid payload: ${parsed.error.message.slice(0, 300)}`, 502, true);
    }
    return parsed.data;
  }

  return {
    generateRoadmap: (req: RoadmapGenerateRequest) => post("/v1/roadmaps/generate", req, RoadmapResponseSchema, 300_000),
    generateAssessment: (req: AssessmentGenerateRequest) => post("/v1/assessments/generate", req, GeneratedAssessmentSchema, 120_000),
    generateExercises: (req: ExerciseGenerateRequest) => post("/v1/exercises/generate", req, GeneratedExercisesSchema, 180_000),
    hint: (req: HintRequest) => post("/v1/tutor/hint", req, HintResponseSchema),
    tutorReply: (req: TutorReplyRequest) => post("/v1/tutor/reply", req, TutorReplySchema),
    evaluateExplanation: (req: ExplanationEvaluateRequest) => post("/v1/explanations/evaluate", req, ExplanationEvaluationSchema),
    calculateMastery: (req: MasteryRequest) => post("/v1/mastery/calculate", req, MasteryResultSchema, 10_000),
    scheduleRevisions: (req: RevisionScheduleRequest) => post("/v1/revisions/schedule", req, RevisionScheduleSchema, 10_000),
    recommendNext: (req: RecommendationRequest) => post("/v1/recommendations/next", req, RecommendationSchema, 10_000),
  };
}

export type AiClient = ReturnType<typeof createAiClient>;
