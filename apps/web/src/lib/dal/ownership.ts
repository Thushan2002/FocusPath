import "server-only";
import { and, eq } from "drizzle-orm";
import { assessments, concepts, exercises, modules, roadmaps } from "@focuspath/db";
import { db } from "../db";
import { notFound } from "../errors";

/**
 * Authorization guards. Every operation on a learner-owned resource loads it through one of
 * these, so another learner's ids resolve to 404 (never 403 — existence isn't leaked).
 * Keeping them in one module makes the access-control surface easy to audit.
 */

/** A concept, only if it belongs to one of the user's roadmaps. */
export async function ownedConcept(userId: string, conceptId: string) {
  const [row] = await db()
    .select({ concept: concepts, module: modules, roadmap: roadmaps })
    .from(concepts)
    .innerJoin(modules, eq(modules.id, concepts.moduleId))
    .innerJoin(roadmaps, eq(roadmaps.id, concepts.roadmapId))
    .where(and(eq(concepts.id, conceptId), eq(roadmaps.userId, userId)));
  if (!row) throw notFound("Concept not found");
  return row;
}

export async function ownedExercise(userId: string, exerciseId: string) {
  const [ex] = await db()
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
  if (!ex) throw notFound("Exercise not found");
  return ex;
}

export async function ownedAssessment(userId: string, assessmentId: string) {
  const [row] = await db()
    .select({ a: assessments, concept: concepts })
    .from(assessments)
    .innerJoin(concepts, eq(concepts.id, assessments.conceptId))
    .where(and(eq(assessments.id, assessmentId), eq(assessments.userId, userId)));
  if (!row) throw notFound("Quiz not found");
  return row;
}
