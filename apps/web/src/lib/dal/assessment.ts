import "server-only";
import { and, asc, eq, gte, isNull, lte, sum } from "drizzle-orm";
import {
  assessmentAttempts,
  assessments,
  conceptMastery,
  concepts,
  exerciseSubmissions,
  exercises,
  explanations,
  questions,
  revisionItems,
  studySessions,
  xpEvents,
} from "@focuspath/db";
import { MASTERY, firstPerKey, usedAnswerHint } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { conflict, notFound } from "../errors";
import {
  getCompletionCriteria,
  getSubtopicIndex,
  toConceptContext,
  type SubtopicIndex,
} from "./concept";
import { awardXp, recordEvidenceDay } from "./engagement";
import { recomputeMastery } from "./mastery";
import { ownedAssessment, ownedConcept } from "./ownership";
import { completeTasksByEvidence } from "./plan";
import { getLearnerSettings } from "./profile";
import {
  activeRecommendation,
  refreshRecommendation,
  toRecommendationView,
} from "./recommendations";
import { listRevisions, ownedRevision, rescheduleRevisions } from "./revisions";

/** Knowledge evidence: AI-generated quizzes, graded on the server. */

type AssessmentKind = "concept_quiz" | "recall";

const QUESTION_COUNT: Record<AssessmentKind, number> = { concept_quiz: 10, recall: 5 };
/** A recall quiz closes every revision item for the concept that is due within this window. */
const RECALL_CLOSES_DUE_WITHIN_MS = 24 * 3600_000;
/** XP events this close to a submission are attributed to it on the Results screen. */
const XP_WINDOW = { beforeMs: 2_000, afterMs: 60_000 };
const RESULTS_REVISION_LIMIT = 6;

export async function createAssessment(
  userId: string,
  conceptId: string,
  kind: AssessmentKind = "concept_quiz",
) {
  const { concept } = await ownedConcept(userId, conceptId);
  const [settings, index, weak] = await Promise.all([
    getLearnerSettings(userId),
    getSubtopicIndex(conceptId),
    db()
      .select({ subtopicId: conceptMastery.subtopicId })
      .from(conceptMastery)
      .where(and(eq(conceptMastery.userId, userId), eq(conceptMastery.conceptId, conceptId))),
  ]);

  const generated = await ai().generateAssessment({
    concept: toConceptContext(concept, index.list),
    level: settings.level,
    weakSubtopicKeys: weak
      .map((w) => index.keyOf(w.subtopicId))
      .filter((k): k is string => k !== null),
    count: QUESTION_COUNT[kind],
  });

  return db().transaction(async (tx) => {
    const [a] = await tx
      .insert(assessments)
      .values({ userId, conceptId, kind, generatedBy: "ai" })
      .returning();
    await tx.insert(questions).values(
      generated.questions.map((q, i) => ({
        assessmentId: a!.id,
        subtopicId: index.idOf(q.subtopicKey),
        position: i,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        rationale: q.rationale,
      })),
    );
    return { id: a!.id };
  });
}

/** Questions without answers. */
export async function getAssessment(userId: string, assessmentId: string) {
  const { a, concept } = await ownedAssessment(userId, assessmentId);
  const [qs, [attempt]] = await Promise.all([
    db()
      .select()
      .from(questions)
      .where(eq(questions.assessmentId, assessmentId))
      .orderBy(asc(questions.position)),
    db()
      .select({ id: assessmentAttempts.id })
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.assessmentId, assessmentId)),
  ]);
  return {
    id: a.id,
    kind: a.kind,
    concept: { id: concept.id, title: concept.title },
    attemptId: attempt?.id ?? null,
    questions: qs.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
  };
}
export type AssessmentView = Awaited<ReturnType<typeof getAssessment>>;

interface GradedAttempt {
  correct: number;
  score: number;
  /** subtopicKey → fraction correct */
  perSubtopic: Record<string, number>;
}

/** Pure grading: overall score plus a per-subtopic breakdown. */
function grade(
  qs: readonly { id: string; subtopicId: string | null; correctIndex: number }[],
  answers: Record<string, number>,
  index: SubtopicIndex,
): GradedAttempt {
  let correct = 0;
  const bySub = new Map<string, { c: number; n: number }>();
  for (const q of qs) {
    const ok = answers[q.id] === q.correctIndex;
    if (ok) correct++;
    const key = index.keyOf(q.subtopicId);
    if (key) {
      const s = bySub.get(key) ?? { c: 0, n: 0 };
      bySub.set(key, { c: s.c + (ok ? 1 : 0), n: s.n + 1 });
    }
  }
  return {
    correct,
    score: qs.length ? correct / qs.length : 0,
    perSubtopic: Object.fromEntries([...bySub].map(([k, v]) => [k, v.c / v.n])),
  };
}

/** Grade on the server, then update mastery → revision schedule → recommendation → XP. */
export async function submitAttempt(
  userId: string,
  assessmentId: string,
  answers: Record<string, number>,
) {
  const { a, concept } = await ownedAssessment(userId, assessmentId);
  const [existing] = await db()
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.assessmentId, assessmentId));
  if (existing) throw conflict("This quiz was already submitted");

  const [qs, index, criteria, settings] = await Promise.all([
    db().select().from(questions).where(eq(questions.assessmentId, assessmentId)),
    getSubtopicIndex(concept.id),
    getCompletionCriteria(concept.id),
    getLearnerSettings(userId),
  ]);
  const { correct, score, perSubtopic } = grade(qs, answers, index);
  const passed = score * 100 >= criteria.quizPassPct;

  const attemptId = await db().transaction(async (tx) => {
    const [attempt] = await tx
      .insert(assessmentAttempts)
      .values({
        assessmentId,
        userId,
        conceptId: concept.id,
        answers,
        correct,
        total: qs.length,
        score,
        perSubtopic,
      })
      .returning({ id: assessmentAttempts.id });
    await completeTasksByEvidence(
      tx,
      userId,
      concept.id,
      "assessment",
      `assessment_attempt:${attempt!.id}`,
    );
    if (passed) {
      // First pass per concept pays; retakes still count as evidence but not XP.
      await awardXp(tx, userId, "quiz_passed", `quiz:${concept.id}`, settings.timezone);
    } else {
      await recordEvidenceDay(tx, userId, settings.timezone);
    }
    if (a.kind === "recall") {
      await tx
        .update(revisionItems)
        .set({ completedAt: new Date() })
        .where(
          and(
            eq(revisionItems.userId, userId),
            eq(revisionItems.conceptId, concept.id),
            isNull(revisionItems.completedAt),
            lte(revisionItems.dueAt, new Date(Date.now() + RECALL_CLOSES_DUE_WITHIN_MS)),
          ),
        );
    }
    return attempt!.id;
  });

  const mastery = await recomputeMastery(userId, concept.id);
  await rescheduleRevisions(userId, concept.id, mastery);
  await refreshRecommendation(userId);
  return { attemptId };
}

export async function getResults(userId: string, attemptId: string) {
  const [attempt] = await db()
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.id, attemptId), eq(assessmentAttempts.userId, userId)));
  if (!attempt) throw notFound("Results not found");
  const conceptId = attempt.conceptId;
  const submittedMs = attempt.submittedAt.getTime();

  const [
    [concept],
    index,
    mastery,
    exRows,
    solvedRows,
    explCount,
    studySecs,
    xpRows,
    revisions,
    qs,
    rec,
  ] = await Promise.all([
    db().select({ title: concepts.title }).from(concepts).where(eq(concepts.id, conceptId)),
    getSubtopicIndex(conceptId),
    db()
      .select()
      .from(conceptMastery)
      .where(and(eq(conceptMastery.userId, userId), eq(conceptMastery.conceptId, conceptId))),
    db()
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.userId, userId), eq(exercises.conceptId, conceptId))),
    db()
      .select({
        exerciseId: exerciseSubmissions.exerciseId,
        hint: exerciseSubmissions.maxHintLevelUsed,
      })
      .from(exerciseSubmissions)
      .where(
        and(
          eq(exerciseSubmissions.userId, userId),
          eq(exerciseSubmissions.conceptId, conceptId),
          eq(exerciseSubmissions.solved, true),
        ),
      )
      .orderBy(asc(exerciseSubmissions.submittedAt)),
    db()
      .select({ id: explanations.id })
      .from(explanations)
      .where(and(eq(explanations.userId, userId), eq(explanations.conceptId, conceptId))),
    db()
      .select({ s: sum(studySessions.activeSeconds) })
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), eq(studySessions.conceptId, conceptId))),
    db()
      .select({ amount: xpEvents.amount })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, userId),
          gte(xpEvents.createdAt, new Date(submittedMs - XP_WINDOW.beforeMs)),
          lte(xpEvents.createdAt, new Date(submittedMs + XP_WINDOW.afterMs)),
        ),
      ),
    listRevisions(userId, RESULTS_REVISION_LIMIT),
    db()
      .select({
        id: questions.id,
        prompt: questions.prompt,
        options: questions.options,
        correctIndex: questions.correctIndex,
        rationale: questions.rationale,
      })
      .from(questions)
      .where(eq(questions.assessmentId, attempt.assessmentId))
      .orderBy(asc(questions.position)),
    activeRecommendation(userId),
  ]);

  const solvedAlone = firstPerKey(solvedRows, (s) => s.exerciseId).filter(
    (s) => !usedAnswerHint(s.hint),
  ).length;
  const conceptRow = mastery.find((m) => m.subtopicId === null);

  return {
    attemptId,
    concept: { id: conceptId, title: concept?.title ?? "" },
    counts: { questions: attempt.total, exercises: exRows.length, explanations: explCount.length },
    xpEarned: xpRows.reduce((s, x) => s + x.amount, 0),
    passMark: MASTERY.passMark,
    mastery: conceptRow
      ? {
          score: Math.round(conceptRow.score),
          components: {
            quiz: conceptRow.quizComponent,
            practical: conceptRow.practicalComponent,
            explanation: conceptRow.explanationComponent,
          },
          calcVersion: conceptRow.calcVersion,
        }
      : null,
    parts: index.list.map((s) => {
      const m = mastery.find((x) => x.subtopicId === s.id);
      return { id: s.id, title: s.title, score: m ? Math.round(m.score) : null };
    }),
    evidence: {
      activityMinutes: Math.round(Number(studySecs[0]?.s ?? 0) / 60),
      knowledge: { correct: attempt.correct, total: attempt.total },
      practical: { solvedAlone, total: exRows.length },
    },
    review: qs.map((q) => ({ ...q, chosen: attempt.answers[q.id] ?? null })),
    recommendation: rec && toRecommendationView(rec),
    revisions: revisions.map((r) => ({
      id: r.id,
      title: r.title,
      conceptTitle: r.conceptTitle,
      dueAt: r.dueAt,
      minutes: r.minutes,
      reason: r.reason,
      weak: r.kind === "practice" && r.intervalDays <= 1,
    })),
  };
}
export type ResultsView = Awaited<ReturnType<typeof getResults>>;

/** "Start 10-min recall": a short recall quiz for the revision's concept. */
export async function startRevision(userId: string, revisionId: string) {
  const r = await ownedRevision(userId, revisionId);
  return createAssessment(userId, r.conceptId, "recall");
}
