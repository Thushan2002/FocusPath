import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  assessmentAttempts,
  conceptMastery,
  conceptPrerequisites,
  concepts,
  dailyPlans,
  exerciseSubmissions,
  explanations,
  goals,
  modules,
  roadmaps,
} from "@focuspath/db";
import { MASTERY, deriveConceptStatuses, localDate, type ConceptStatus } from "@focuspath/shared";
import { db } from "../db";
import { notFound } from "../errors";
import { getCompletionCriteria, getSubtopics } from "./concept";
import { ownedConcept } from "./ownership";
import { getActiveGoal, getLearnerSettings, getProfile } from "./profile";

export interface ConceptNode {
  id: string;
  key: string;
  title: string;
  summary: string;
  estMinutes: number;
  position: number;
  moduleId: string;
  prerequisiteIds: string[];
  mastery: number | null;
  status: ConceptStatus;
}

export interface ModuleNode {
  id: string;
  key: string;
  title: string;
  milestone: string;
  estWeeks: number;
  position: number;
  concepts: ConceptNode[];
}

export async function todayFocusConceptId(userId: string): Promise<string | null> {
  const { timezone } = await getLearnerSettings(userId);
  const today = localDate(new Date(), timezone);
  const [plan] = await db()
    .select({ focus: dailyPlans.focusConceptId })
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)));
  return plan?.focus ?? null;
}

/** The whole roadmap with derived concept statuses. */
export async function loadRoadmapTree(userId: string, roadmapId: string): Promise<ModuleNode[]> {
  const mods = await db()
    .select()
    .from(modules)
    .where(eq(modules.roadmapId, roadmapId))
    .orderBy(asc(modules.position));
  const cons = await db()
    .select()
    .from(concepts)
    .where(eq(concepts.roadmapId, roadmapId))
    .orderBy(asc(concepts.position));
  const ids = cons.map((c) => c.id);
  if (!ids.length) return [];

  const [prereqs, mastery, evidence, focus] = await Promise.all([
    db().select().from(conceptPrerequisites).where(inArray(conceptPrerequisites.conceptId, ids)),
    db()
      .select({ conceptId: conceptMastery.conceptId, score: conceptMastery.score })
      .from(conceptMastery)
      .where(
        and(
          eq(conceptMastery.userId, userId),
          isNull(conceptMastery.subtopicId),
          inArray(conceptMastery.conceptId, ids),
        ),
      ),
    conceptsWithEvidence(userId, ids),
    todayFocusConceptId(userId),
  ]);

  const masteryBy = new Map(mastery.map((m) => [m.conceptId, m.score]));
  const prereqBy = new Map<string, string[]>();
  for (const p of prereqs)
    prereqBy.set(p.conceptId, [...(prereqBy.get(p.conceptId) ?? []), p.requiresConceptId]);

  const modPos = new Map(mods.map((m) => [m.id, m.position]));
  const ordered = [...cons].sort(
    (a, b) => modPos.get(a.moduleId)! - modPos.get(b.moduleId)! || a.position - b.position,
  );
  const statuses = deriveConceptStatuses(
    ordered.map((c) => ({
      id: c.id,
      prerequisiteIds: prereqBy.get(c.id) ?? [],
      mastery: masteryBy.get(c.id) ?? null,
      hasEvidence: evidence.has(c.id),
    })),
    focus,
    MASTERY.passMark,
  );

  return mods.map((m) => ({
    id: m.id,
    key: m.key,
    title: m.title,
    milestone: m.milestone,
    estWeeks: m.estWeeks,
    position: m.position,
    concepts: ordered
      .filter((c) => c.moduleId === m.id)
      .map((c) => ({
        id: c.id,
        key: c.key,
        title: c.title,
        summary: c.summary,
        estMinutes: c.estMinutes,
        position: c.position,
        moduleId: c.moduleId,
        prerequisiteIds: prereqBy.get(c.id) ?? [],
        mastery: masteryBy.get(c.id) ?? null,
        status: statuses.get(c.id)!,
      })),
  }));
}

async function conceptsWithEvidence(userId: string, conceptIds: string[]): Promise<Set<string>> {
  const rows = await db().execute<{ concept_id: string }>(sql`
    select distinct concept_id from (
      select ${assessmentAttempts.conceptId} as concept_id from ${assessmentAttempts}
        where ${assessmentAttempts.userId} = ${userId}
      union select ${exerciseSubmissions.conceptId} from ${exerciseSubmissions}
        where ${exerciseSubmissions.userId} = ${userId}
      union select ${explanations.conceptId} from ${explanations}
        where ${explanations.userId} = ${userId}
    ) e where concept_id in ${conceptIds}
  `);
  return new Set(rows.map((r) => r.concept_id));
}

export async function getRoadmapView(userId: string) {
  const goal = await getActiveGoal(userId);
  if (!goal?.activeRoadmapId) return null;
  const [roadmap] = await db()
    .select()
    .from(roadmaps)
    .where(and(eq(roadmaps.id, goal.activeRoadmapId), eq(roadmaps.userId, userId)));
  if (!roadmap) return null;
  const [profile, tree] = await Promise.all([
    getProfile(userId),
    loadRoadmapTree(userId, roadmap.id),
  ]);
  const all = tree.flatMap((m) => m.concepts);
  const current = tree.find((m) => m.concepts.some((c) => c.status !== "mastered")) ?? tree.at(-1);
  return {
    goal: { id: goal.id, title: goal.title },
    roadmap: {
      id: roadmap.id,
      version: roadmap.version,
      title: roadmap.title,
      summary: roadmap.summary,
    },
    profile: profile && {
      level: profile.level,
      dailyMinutes: profile.dailyMinutes,
      targetMonths: profile.targetMonths,
    },
    modules: tree,
    totals: {
      modules: tree.length,
      concepts: all.length,
      mastered: all.filter((c) => c.status === "mastered").length,
    },
    currentModule: current && {
      id: current.id,
      position: current.position,
      title: current.title,
      mastered: current.concepts.filter((c) => c.status === "mastered").length,
      total: current.concepts.length,
    },
    focusConceptId: await todayFocusConceptId(userId),
  };
}
export type RoadmapView = NonNullable<Awaited<ReturnType<typeof getRoadmapView>>>;

export async function getConceptDetail(userId: string, conceptId: string) {
  const { concept, module, roadmap } = await ownedConcept(userId, conceptId);
  const [subs, criteria, tree] = await Promise.all([
    getSubtopics(conceptId),
    getCompletionCriteria(conceptId),
    loadRoadmapTree(userId, roadmap.id),
  ]);
  const flat = tree.flatMap((m) => m.concepts);
  const node = flat.find((c) => c.id === conceptId);
  if (!node) throw notFound("Concept not found");
  const moduleConcepts = tree.find((m) => m.id === module.id)?.concepts ?? [];
  return {
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    estMinutes: concept.estMinutes,
    module: { id: module.id, title: module.title, position: module.position },
    indexInModule: moduleConcepts.findIndex((c) => c.id === conceptId) + 1,
    moduleConceptCount: moduleConcepts.length,
    status: node.status,
    mastery: node.mastery,
    subtopics: subs.map((s) => ({ id: s.id, key: s.key, title: s.title })),
    prerequisites: node.prerequisiteIds.map((pid) => {
      const p = flat.find((c) => c.id === pid);
      return { id: pid, title: p?.title ?? "Unknown", mastered: p?.status === "mastered" };
    }),
    criteria,
  };
}
export type ConceptDetail = Awaited<ReturnType<typeof getConceptDetail>>;

export async function activeGoalWithRoadmap(userId: string) {
  const [row] = await db()
    .select({ goal: goals, roadmap: roadmaps })
    .from(goals)
    .innerJoin(roadmaps, eq(roadmaps.id, goals.activeRoadmapId))
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")));
  return row ?? null;
}
