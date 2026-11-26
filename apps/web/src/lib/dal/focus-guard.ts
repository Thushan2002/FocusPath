import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { dailyTasks, focusEvents } from "@focuspath/db";
import { topicMatches, type FocusChoice } from "@focuspath/shared";
import { db } from "../db";
import { ownedConcept } from "./ownership";
import { getActiveGoal } from "./profile";
import { loadRoadmapTree } from "./roadmap";

/**
 * Focus guard (product rule 5): when a learner wants to switch topics mid-concept, show the
 * trade-off and log the choice. It guides; it never blocks.
 */
export async function checkSwitch(userId: string, conceptId: string, targetTopic: string) {
  const { roadmap, concept } = await ownedConcept(userId, conceptId);
  const [tree, goal, remaining] = await Promise.all([
    loadRoadmapTree(userId, roadmap.id),
    getActiveGoal(userId),
    db()
      .select({ id: dailyTasks.id })
      .from(dailyTasks)
      .where(
        and(
          eq(dailyTasks.userId, userId),
          eq(dailyTasks.conceptId, conceptId),
          isNull(dailyTasks.doneAt),
        ),
      ),
  ]);
  const match = tree
    .flatMap((m) => [{ title: m.title }, ...m.concepts.map((c) => ({ title: c.title }))])
    .find((x) => topicMatches(x.title, targetTopic));
  const current = tree.flatMap((m) => m.concepts).find((c) => c.id === conceptId);
  return {
    onPath: Boolean(match),
    matchedTitle: match?.title ?? null,
    currentTitle: concept.title,
    currentStatus: current?.status ?? "in_progress",
    tasksRemaining: remaining.length,
    goalTitle: goal?.title ?? "",
  };
}
export type SwitchCheck = Awaited<ReturnType<typeof checkSwitch>>;

export async function recordFocusEvent(
  userId: string,
  conceptId: string,
  targetTopic: string,
  choice: FocusChoice,
) {
  const check = await checkSwitch(userId, conceptId, targetTopic);
  await db()
    .insert(focusEvents)
    .values({ userId, conceptId, targetTopic, onPath: check.onPath, choice });
  return { ok: true };
}
