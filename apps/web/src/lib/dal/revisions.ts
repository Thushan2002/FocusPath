import "server-only";
import { and, asc, eq, isNull, min } from "drizzle-orm";
import { assessmentAttempts, concepts, exerciseSubmissions, revisionItems } from "@focuspath/db";
import { MASTERY, type MasteryResult } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { notFound } from "../errors";
import { getSubtopicIndex } from "./concept";

/**
 * Spaced-repetition schedule. The intervals come from services/ai (`domain/scheduler.py`);
 * this module persists them and answers "what's due".
 */

/** Replace the concept's pending revision items with a fresh schedule. */
export async function rescheduleRevisions(
  userId: string,
  conceptId: string,
  mastery: MasteryResult,
) {
  const [[concept], index, learnedAt] = await Promise.all([
    db().select({ title: concepts.title }).from(concepts).where(eq(concepts.id, conceptId)),
    getSubtopicIndex(conceptId),
    firstEvidenceAt(userId, conceptId),
  ]);
  if (!concept) throw notFound("Concept not found");
  const weak = mastery.perSubtopic
    .filter((p) => !p.passed)
    .map((p) => index.byKey(p.subtopicKey))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const schedule = await ai().scheduleRevisions({
    now: new Date().toISOString(),
    learnedAt: (learnedAt ?? new Date()).toISOString(),
    conceptTitle: concept.title,
    masteryScore: mastery.score,
    passMark: MASTERY.passMark,
    weakSubtopics: weak.map((s) => ({ key: s.key, title: s.title })),
  });

  await db().transaction(async (tx) => {
    await tx
      .delete(revisionItems)
      .where(
        and(
          eq(revisionItems.userId, userId),
          eq(revisionItems.conceptId, conceptId),
          isNull(revisionItems.completedAt),
        ),
      );
    if (!schedule.items.length) return;
    await tx.insert(revisionItems).values(
      schedule.items.map((i) => ({
        userId,
        conceptId,
        subtopicId: index.idOf(i.subtopicKey),
        kind: i.kind,
        title: i.title,
        dueAt: new Date(i.dueAt),
        intervalDays: i.intervalDays,
        minutes: i.minutes,
        reason: i.reason,
        schedulerVersion: schedule.schedulerVersion,
      })),
    );
  });
}

/** When the learner first produced knowledge or practical evidence for the concept. */
async function firstEvidenceAt(userId: string, conceptId: string): Promise<Date | null> {
  const [[a], [s]] = await Promise.all([
    db()
      .select({ t: min(assessmentAttempts.submittedAt) })
      .from(assessmentAttempts)
      .where(
        and(eq(assessmentAttempts.userId, userId), eq(assessmentAttempts.conceptId, conceptId)),
      ),
    db()
      .select({ t: min(exerciseSubmissions.submittedAt) })
      .from(exerciseSubmissions)
      .where(
        and(eq(exerciseSubmissions.userId, userId), eq(exerciseSubmissions.conceptId, conceptId)),
      ),
  ]);
  const times = [a?.t, s?.t].filter((t): t is Date => t instanceof Date);
  return times.length ? new Date(Math.min(...times.map((t) => t.getTime()))) : null;
}

/** Pending revision items, soonest first. */
export async function listRevisions(userId: string, limit?: number) {
  const q = db()
    .select({ r: revisionItems, conceptTitle: concepts.title })
    .from(revisionItems)
    .innerJoin(concepts, eq(concepts.id, revisionItems.conceptId))
    .where(and(eq(revisionItems.userId, userId), isNull(revisionItems.completedAt)))
    .orderBy(asc(revisionItems.dueAt));
  const rows = limit ? await q.limit(limit) : await q;
  return rows.map(({ r, conceptTitle }) => ({
    id: r.id,
    conceptId: r.conceptId,
    title: r.title,
    conceptTitle,
    dueAt: r.dueAt.toISOString(),
    minutes: r.minutes,
    reason: r.reason,
    kind: r.kind,
    intervalDays: r.intervalDays,
  }));
}
export type RevisionView = Awaited<ReturnType<typeof listRevisions>>[number];

export async function ownedRevision(userId: string, revisionId: string) {
  const [r] = await db()
    .select()
    .from(revisionItems)
    .where(and(eq(revisionItems.id, revisionId), eq(revisionItems.userId, userId)));
  if (!r) throw notFound("Revision not found");
  return r;
}
