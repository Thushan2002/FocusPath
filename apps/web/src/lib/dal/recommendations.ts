import "server-only";
import { and, asc, eq, inArray, isNull, lte, min } from "drizzle-orm";
import {
  assessmentAttempts,
  conceptMastery,
  recommendations,
  revisionItems,
  subtopics,
} from "@focuspath/db";
import { MASTERY, type RecommendationRequest } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { activeGoalWithRoadmap, loadRoadmapTree, todayFocusConceptId } from "./roadmap";

/**
 * "What should I do next?" — one recommendation at a time, with its reason. The decision rules
 * live in services/ai (`domain/recommender.py`); this module gathers the learner's state and
 * stores the answer.
 */

/** Revisions due within this window count as "due now" for the recommender. */
const DUE_SOON_MS = 12 * 3600_000;

type RecommendationRow = typeof recommendations.$inferSelect;

/** The shape the browser sees (Today dashboard, Results screen). */
export function toRecommendationView(r: RecommendationRow) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    detail: r.detail,
    reason: r.reason,
    estMinutes: r.estMinutes,
    conceptId: r.conceptId,
    revisionItemId: r.revisionItemId,
  };
}
export type RecommendationView = ReturnType<typeof toRecommendationView>;

export async function activeRecommendation(userId: string): Promise<RecommendationRow | null> {
  const [r] = await db()
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.userId, userId), eq(recommendations.status, "active")));
  return r ?? null;
}

/** Ask the recommender for the single next step and store it (superseding the previous one). */
export async function refreshRecommendation(userId: string): Promise<RecommendationRow | null> {
  const active = await activeGoalWithRoadmap(userId);
  if (!active) return null;
  const tree = await loadRoadmapTree(userId, active.roadmap.id);
  const flat = tree.flatMap((m) => m.concepts);
  if (!flat.length) return null;
  const conceptIds = flat.map((c) => c.id);

  const [focusId, subMastery, due, learned] = await Promise.all([
    todayFocusConceptId(userId),
    db()
      .select({
        conceptId: conceptMastery.conceptId,
        score: conceptMastery.score,
        key: subtopics.key,
        title: subtopics.title,
      })
      .from(conceptMastery)
      .innerJoin(subtopics, eq(subtopics.id, conceptMastery.subtopicId))
      .where(and(eq(conceptMastery.userId, userId), inArray(conceptMastery.conceptId, conceptIds))),
    db()
      .select()
      .from(revisionItems)
      .where(
        and(
          eq(revisionItems.userId, userId),
          isNull(revisionItems.completedAt),
          lte(revisionItems.dueAt, new Date(Date.now() + DUE_SOON_MS)),
          inArray(revisionItems.conceptId, conceptIds),
        ),
      )
      .orderBy(asc(revisionItems.dueAt)),
    db()
      .select({ conceptId: assessmentAttempts.conceptId, t: min(assessmentAttempts.submittedAt) })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.userId, userId),
          inArray(assessmentAttempts.conceptId, conceptIds),
        ),
      )
      .groupBy(assessmentAttempts.conceptId),
  ]);
  const keyOf = new Map(flat.map((c) => [c.id, c.key]));
  const learnedAt = new Map(learned.map((l) => [l.conceptId, l.t]));

  const req: RecommendationRequest = {
    now: new Date().toISOString(),
    passMark: MASTERY.passMark,
    focusConceptKey: focusId ? (keyOf.get(focusId) ?? null) : null,
    concepts: flat.map((c) => ({
      key: c.key,
      title: c.title,
      status: c.status,
      mastery: c.mastery,
      lastLearnedAt: learnedAt.get(c.id)?.toISOString() ?? null,
    })),
    weakSubtopics: subMastery
      .filter((s) => s.score < MASTERY.passMark)
      .map((s) => ({
        conceptKey: keyOf.get(s.conceptId)!,
        key: s.key,
        title: s.title,
        score: s.score,
      })),
    dueRevisions: due.map((d) => ({
      id: d.id,
      conceptKey: keyOf.get(d.conceptId)!,
      title: d.title,
      dueAt: d.dueAt.toISOString(),
      minutes: d.minutes,
      kind: d.kind,
    })),
  };
  const rec = await ai().recommendNext(req);
  const conceptId = flat.find((c) => c.key === rec.conceptKey)?.id ?? flat[0]!.id;

  return db().transaction(async (tx) => {
    await tx
      .update(recommendations)
      .set({ status: "superseded" })
      .where(and(eq(recommendations.userId, userId), eq(recommendations.status, "active")));
    const [row] = await tx
      .insert(recommendations)
      .values({
        userId,
        goalId: active.goal.id,
        conceptId,
        revisionItemId: rec.revisionId,
        kind: rec.kind,
        title: rec.title,
        detail: rec.detail,
        reason: rec.reason,
        estMinutes: rec.estMinutes,
      })
      .returning();
    return row!;
  });
}
