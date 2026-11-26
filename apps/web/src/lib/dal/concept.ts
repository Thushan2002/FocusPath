import "server-only";
import { asc, eq } from "drizzle-orm";
import { completionCriteria, concepts, subtopics } from "@focuspath/db";
import { DEFAULTS, MASTERY, type ConceptContext } from "@focuspath/shared";
import { db } from "../db";
import { notFound } from "../errors";

/**
 * Concept-scoped reads shared by every feature module (exercises, assessments, mastery, tutor…).
 *
 * These functions do NOT check ownership — callers authorise first via `ownedConcept` /
 * `ownedExercise` / `ownedAssessment`, then use these to load the concept's structure.
 */

export type Subtopic = typeof subtopics.$inferSelect;

export async function getSubtopics(conceptId: string): Promise<Subtopic[]> {
  return db()
    .select()
    .from(subtopics)
    .where(eq(subtopics.conceptId, conceptId))
    .orderBy(asc(subtopics.position));
}

/**
 * Two-way lookup between subtopic ids (database) and keys (AI contracts speak in stable keys,
 * never ids, so content survives roadmap regeneration).
 */
export class SubtopicIndex {
  private readonly idByKey: Map<string, string>;
  private readonly keyById: Map<string, string>;

  constructor(readonly list: readonly Subtopic[]) {
    this.idByKey = new Map(list.map((s) => [s.key, s.id]));
    this.keyById = new Map(list.map((s) => [s.id, s.key]));
  }

  idOf(key: string | null | undefined): string | null {
    return key ? (this.idByKey.get(key) ?? null) : null;
  }

  keyOf(id: string | null | undefined): string | null {
    return id ? (this.keyById.get(id) ?? null) : null;
  }

  byKey(key: string): Subtopic | undefined {
    return this.list.find((s) => s.key === key);
  }
}

export async function getSubtopicIndex(conceptId: string): Promise<SubtopicIndex> {
  return new SubtopicIndex(await getSubtopics(conceptId));
}

export interface CompletionCriteria {
  quizPassPct: number;
  exercisesRequired: number;
  explanationRequired: boolean;
}

/** The concept's completion criteria, or the product defaults when the roadmap didn't set any. */
export async function getCompletionCriteria(conceptId: string): Promise<CompletionCriteria> {
  const [c] = await db()
    .select()
    .from(completionCriteria)
    .where(eq(completionCriteria.conceptId, conceptId));
  return {
    quizPassPct: c?.quizPassPct ?? MASTERY.passMark,
    exercisesRequired: c?.exercisesRequired ?? DEFAULTS.exercisesRequired,
    explanationRequired: c?.explanationRequired ?? DEFAULTS.explanationRequired,
  };
}

/** Exactly the `ConceptContext` contract — services/ai rejects unknown fields. */
export function toConceptContext(
  concept: { key: string; title: string; summary: string },
  subs: readonly { key: string; title: string }[],
): ConceptContext {
  return {
    key: concept.key,
    title: concept.title,
    summary: concept.summary,
    subtopics: subs.map((s) => ({ key: s.key, title: s.title })),
  };
}

export async function getConceptContext(conceptId: string): Promise<ConceptContext> {
  const [concept] = await db().select().from(concepts).where(eq(concepts.id, conceptId));
  if (!concept) throw notFound("Concept not found");
  return toConceptContext(concept, await getSubtopics(conceptId));
}
