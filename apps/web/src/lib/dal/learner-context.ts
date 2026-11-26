import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { conceptMastery, exerciseSubmissions, explanations, subtopics } from "@focuspath/db";
import { MASTERY, type LearnerContext } from "@focuspath/shared";
import { db } from "../db";
import { getActiveGoal, getLearnerSettings } from "./profile";

const RECENT_FAILED_SUBMISSIONS = 5;
const RECENT_EXPLANATIONS = 2;
const MAX_MISTAKES = 6;

/**
 * What the AI knows about the learner for one concept (product rule 6): their goal, level,
 * weak subtopics and recent mistakes. Used by the tutor, hints and exercise generation.
 */
export async function buildLearnerContext(
  userId: string,
  conceptId: string,
  conceptTitle: string,
): Promise<LearnerContext> {
  const [goal, settings, weak, fails, expl] = await Promise.all([
    getActiveGoal(userId),
    getLearnerSettings(userId),
    db()
      .select({ title: subtopics.title, score: conceptMastery.score })
      .from(conceptMastery)
      .innerJoin(subtopics, eq(subtopics.id, conceptMastery.subtopicId))
      .where(and(eq(conceptMastery.userId, userId), eq(conceptMastery.conceptId, conceptId))),
    db()
      .select({ results: exerciseSubmissions.results })
      .from(exerciseSubmissions)
      .where(
        and(
          eq(exerciseSubmissions.userId, userId),
          eq(exerciseSubmissions.conceptId, conceptId),
          eq(exerciseSubmissions.solved, false),
        ),
      )
      .orderBy(desc(exerciseSubmissions.submittedAt))
      .limit(RECENT_FAILED_SUBMISSIONS),
    db()
      .select({ m: explanations.misconceptions })
      .from(explanations)
      .where(and(eq(explanations.userId, userId), eq(explanations.conceptId, conceptId)))
      .orderBy(desc(explanations.createdAt))
      .limit(RECENT_EXPLANATIONS),
  ]);
  const mistakes = [
    ...fails.flatMap((f) =>
      f.results.filter((r) => !r.passed && r.message).map((r) => `${r.name}: ${r.message}`),
    ),
    ...expl.flatMap((e) => e.m),
  ];
  return {
    goal: goal?.title ?? "",
    level: settings.level,
    currentConcept: conceptTitle,
    weakAreas: weak.filter((w) => w.score < MASTERY.passMark).map((w) => w.title),
    recentMistakes: [...new Set(mistakes)].slice(0, MAX_MISTAKES),
  };
}
