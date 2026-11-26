import { eq } from "drizzle-orm";
import { goals, learnerProfiles, roadmaps, type Database } from "@focuspath/db";
import { saveRoadmapDraft } from "@focuspath/db/roadmap";
import { AiServiceError, type AiClient } from "@focuspath/shared/ai-client";
import { UnrecoverableError } from "bullmq";

/** Generate → validate (in services/ai and again here via Zod) → save as the roadmap version. */
export async function generateRoadmap(db: Database, ai: AiClient, roadmapId: string) {
  const [row] = await db
    .select({ roadmap: roadmaps, goal: goals, profile: learnerProfiles })
    .from(roadmaps)
    .innerJoin(goals, eq(goals.id, roadmaps.goalId))
    .innerJoin(learnerProfiles, eq(learnerProfiles.userId, roadmaps.userId))
    .where(eq(roadmaps.id, roadmapId));
  if (!row) throw new UnrecoverableError(`roadmap ${roadmapId} not found`);
  if (row.roadmap.status !== "generating") return; // already done (job retried after success)

  try {
    const res = await ai.generateRoadmap({
      goal: row.goal.title,
      level: row.profile.level,
      priorKnowledge: row.profile.priorKnowledge,
      dailyMinutes: row.profile.dailyMinutes,
      targetMonths: row.profile.targetMonths,
      struggle: row.profile.struggle,
    });
    await saveRoadmapDraft(db, {
      roadmapId,
      draft: res.roadmap,
      model: res.model,
      promptVersion: res.promptVersion,
    });
  } catch (err) {
    if (err instanceof AiServiceError && !err.retryable) throw new UnrecoverableError(err.message);
    throw err;
  }
}
