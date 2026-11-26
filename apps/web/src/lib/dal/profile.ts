import "server-only";
import { and, desc, eq, max } from "drizzle-orm";
import { goals, learnerProfiles, roadmaps } from "@focuspath/db";
import { DEFAULTS, type Level, type OnboardingInput, type ProfileUpdate } from "@focuspath/shared";
import { db } from "../db";
import { conflict, notFound } from "../errors";

export type LearnerProfile = typeof learnerProfiles.$inferSelect;

export async function getProfile(userId: string): Promise<LearnerProfile | null> {
  const [p] = await db().select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId));
  return p ?? null;
}

/** For flows that only make sense after onboarding (plans, today view). */
export async function requireProfile(userId: string): Promise<LearnerProfile> {
  const p = await getProfile(userId);
  if (!p) throw conflict("Finish onboarding first");
  return p;
}

/** The two profile fields most flows need, with defaults for learners who haven't onboarded. */
export interface LearnerSettings {
  level: Level;
  timezone: string;
}

export async function getLearnerSettings(userId: string): Promise<LearnerSettings> {
  const p = await getProfile(userId);
  return { level: p?.level ?? DEFAULTS.level, timezone: p?.timezone ?? DEFAULTS.timezone };
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<LearnerProfile> {
  if (Object.keys(patch).length) {
    await db().update(learnerProfiles).set(patch).where(eq(learnerProfiles.userId, userId));
  }
  const p = await getProfile(userId);
  if (!p) throw notFound("No profile yet");
  return p;
}

export async function getActiveGoal(userId: string) {
  const [g] = await db()
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")))
    .orderBy(desc(goals.createdAt))
    .limit(1);
  return g ?? null;
}

/** Where a signed-in learner should land. */
export async function homePathFor(userId: string): Promise<string> {
  const goal = await getActiveGoal(userId);
  if (!goal) return "/onboarding";
  if (!goal.activeRoadmapId) return "/roadmap/generating";
  return "/today";
}

/**
 * Saves the learning profile, makes this the one active goal (one goal at a time — the core
 * promise) and opens roadmap version 1 in `generating` state.
 */
export async function completeOnboarding(userId: string, input: OnboardingInput) {
  return db().transaction(async (tx) => {
    const profile = {
      level: input.level,
      priorKnowledge: input.priorKnowledge,
      dailyMinutes: input.dailyMinutes,
      targetMonths: input.targetMonths,
      struggle: input.struggle,
      timezone: input.timezone,
    };
    await tx
      .insert(learnerProfiles)
      .values({ userId, ...profile })
      .onConflictDoUpdate({ target: learnerProfiles.userId, set: profile });

    await tx
      .update(goals)
      .set({ status: "archived" })
      .where(and(eq(goals.userId, userId), eq(goals.status, "active")));
    const [goal] = await tx.insert(goals).values({ userId, title: input.goal }).returning();
    const [roadmap] = await tx
      .insert(roadmaps)
      .values({ goalId: goal!.id, userId, version: 1, status: "generating" })
      .returning();
    return { goalId: goal!.id, roadmapId: roadmap!.id };
  });
}

/** Opens a new roadmap version for the active goal ("Edit plan" → regenerate). */
export async function startRoadmapRegeneration(userId: string, goalId: string) {
  const [goal] = await db()
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (!goal) throw notFound("Goal not found");
  const [{ v } = { v: 0 }] = await db()
    .select({ v: max(roadmaps.version) })
    .from(roadmaps)
    .where(eq(roadmaps.goalId, goalId));
  const [roadmap] = await db()
    .insert(roadmaps)
    .values({ goalId, userId, version: (v ?? 0) + 1, status: "generating" })
    .returning();
  return { roadmapId: roadmap!.id };
}

export async function getRoadmapStatus(userId: string, roadmapId: string) {
  const [r] = await db()
    .select({
      id: roadmaps.id,
      status: roadmaps.status,
      error: roadmaps.error,
      goalId: roadmaps.goalId,
    })
    .from(roadmaps)
    .where(and(eq(roadmaps.id, roadmapId), eq(roadmaps.userId, userId)));
  if (!r) throw notFound("Roadmap not found");
  return r;
}

export async function latestRoadmapFor(userId: string) {
  const [r] = await db()
    .select({ id: roadmaps.id, status: roadmaps.status, error: roadmaps.error })
    .from(roadmaps)
    .innerJoin(goals, eq(goals.id, roadmaps.goalId))
    .where(and(eq(roadmaps.userId, userId), eq(goals.status, "active")))
    .orderBy(desc(roadmaps.createdAt))
    .limit(1);
  return r ?? null;
}
