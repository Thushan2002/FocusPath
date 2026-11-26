import "server-only";
import { and, asc, eq } from "drizzle-orm";
import {
  assessmentAttempts,
  conceptMastery,
  exerciseSubmissions,
  exercises,
  explanations,
} from "@focuspath/db";
import { firstPerKey, usedAnswerHint, type MasteryResult } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { getCompletionCriteria, getSubtopicIndex } from "./concept";

/**
 * Mastery estimate for one concept, recomputed from the three kinds of evidence (quiz attempts,
 * solved exercises, accepted explanations). The scoring rule itself lives in services/ai
 * (`domain/mastery.py`); this module only gathers evidence and persists the result.
 */
export async function recomputeMastery(userId: string, conceptId: string): Promise<MasteryResult> {
  const [criteria, index, attempts, solves, expl] = await Promise.all([
    getCompletionCriteria(conceptId),
    getSubtopicIndex(conceptId),
    db()
      .select()
      .from(assessmentAttempts)
      .where(
        and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.conceptId, conceptId)),
      ),
    db()
      .select({ sub: exerciseSubmissions, subtopicId: exercises.subtopicId })
      .from(exerciseSubmissions)
      .innerJoin(exercises, eq(exercises.id, exerciseSubmissions.exerciseId))
      .where(
        and(
          eq(exerciseSubmissions.userId, userId),
          eq(exerciseSubmissions.conceptId, conceptId),
          eq(exerciseSubmissions.solved, true),
        ),
      )
      .orderBy(asc(exerciseSubmissions.submittedAt)),
    db()
      .select()
      .from(explanations)
      .where(and(eq(explanations.userId, userId), eq(explanations.conceptId, conceptId))),
  ]);

  // First solve of each exercise is the evidence; later re-solves don't stack.
  const firstSolves = firstPerKey(solves, (s) => s.sub.exerciseId);

  const result = await ai().calculateMastery({
    now: new Date().toISOString(),
    passMark: criteria.quizPassPct,
    exercisesRequired: criteria.exercisesRequired,
    subtopicKeys: index.list.map((s) => s.key),
    evidence: {
      quiz: attempts.map((a) => ({
        at: a.submittedAt.toISOString(),
        score: a.score,
        bySubtopic: a.perSubtopic,
      })),
      exercises: firstSolves.map((s) => ({
        at: s.sub.submittedAt.toISOString(),
        subtopicKey: index.keyOf(s.subtopicId),
        solvedWithoutFinalHint: !usedAnswerHint(s.sub.maxHintLevelUsed),
      })),
      explanations: expl.map((e) => ({ at: e.createdAt.toISOString(), score: e.aiScore })),
    },
  });

  await saveMastery(userId, conceptId, result, (key) => index.idOf(key));
  return result;
}

/** Upsert the concept-level row (subtopicId = null) plus one row per known subtopic. */
async function saveMastery(
  userId: string,
  conceptId: string,
  result: MasteryResult,
  subtopicIdOf: (key: string) => string | null,
) {
  const base = { userId, conceptId, calcVersion: result.calcVersion, updatedAt: new Date() };
  const target = [conceptMastery.userId, conceptMastery.conceptId, conceptMastery.subtopicId];
  await db().transaction(async (tx) => {
    const conceptRow = {
      ...base,
      subtopicId: null,
      score: result.score,
      quizComponent: result.components.quiz,
      practicalComponent: result.components.practical,
      explanationComponent: result.components.explanation,
      quizCount: result.counts.quiz,
      exerciseCount: result.counts.exercises,
      explanationCount: result.counts.explanations,
    };
    await tx
      .insert(conceptMastery)
      .values(conceptRow)
      .onConflictDoUpdate({ target, set: conceptRow });
    for (const p of result.perSubtopic) {
      const subtopicId = subtopicIdOf(p.subtopicKey);
      if (!subtopicId) continue;
      const row = { ...base, subtopicId, score: p.score };
      await tx.insert(conceptMastery).values(row).onConflictDoUpdate({ target, set: row });
    }
  });
}
