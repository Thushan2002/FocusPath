import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, isNull, sql } from "drizzle-orm";
import {
  conceptMastery,
  dailyPlans,
  dailyTasks,
  exerciseSubmissions,
  exercises,
  focusEvents,
  studySessions,
  taskTemplates,
  type DbExecutor,
} from "@focuspath/db";
import {
  MASTERY,
  isManuallyCompletable,
  levelProgress,
  localDate,
  planDailyTasks,
  visibleStreak,
  weekDates,
  type TaskKind,
} from "@focuspath/shared";
import { db } from "../db";
import { conflict, notFound } from "../errors";
import { getCompletionCriteria } from "./concept";
import { getStreak, totalXp } from "./engagement";
import { ownedConcept } from "./ownership";
import { getActiveGoal, requireProfile } from "./profile";
import {
  activeRecommendation,
  refreshRecommendation,
  toRecommendationView,
} from "./recommendations";
import { loadRoadmapTree } from "./roadmap";

/** Daily plans: today's focus concept, its tasks, and the Today dashboard view. */

/** Study time can't exceed wall-clock time since the session started (plus this much slack). */
const SESSION_CLOCK_SLACK_SECONDS = 5;

/** "Set as today's focus": today's plan becomes this concept's tasks, scaled to the learner's time. */
export async function setTodayFocus(userId: string, conceptId: string) {
  const { roadmap } = await ownedConcept(userId, conceptId);
  const profile = await requireProfile(userId);
  const today = localDate(new Date(), profile.timezone);
  const templates = await db()
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.conceptId, conceptId))
    .orderBy(asc(taskTemplates.position));
  const planned = planDailyTasks(
    templates.map((t) => ({ kind: t.kind as TaskKind, title: t.title, minutes: t.minutes })),
    profile.dailyMinutes,
  );

  const planId = await db().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dailyPlans)
      .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)));
    let id: string;
    if (existing) {
      if (existing.focusConceptId === conceptId) return existing.id;
      await tx
        .update(dailyPlans)
        .set({ focusConceptId: conceptId, goalId: roadmap.goalId })
        .where(eq(dailyPlans.id, existing.id));
      // Finished tasks stay as history; unfinished ones from the old focus are replaced.
      await tx
        .delete(dailyTasks)
        .where(and(eq(dailyTasks.dailyPlanId, existing.id), isNull(dailyTasks.doneAt)));
      id = existing.id;
    } else {
      const [plan] = await tx
        .insert(dailyPlans)
        .values({ userId, goalId: roadmap.goalId, planDate: today, focusConceptId: conceptId })
        .returning();
      id = plan!.id;
    }
    const [{ n } = { n: 0 }] = await tx
      .select({ n: count() })
      .from(dailyTasks)
      .where(eq(dailyTasks.dailyPlanId, id));
    if (planned.length) {
      await tx.insert(dailyTasks).values(
        planned.map((t) => ({
          dailyPlanId: id,
          userId,
          conceptId,
          position: n + t.position,
          kind: t.kind,
          evidenceKind: t.evidenceKind,
          title: t.title,
          minutes: t.minutes,
        })),
      );
    }
    return id;
  });

  // Evidence that already exists for this concept today still counts.
  await syncEvidenceTasks(userId, conceptId);
  await refreshRecommendation(userId).catch((e) =>
    console.error("recommendation refresh failed", e),
  );
  return { planId };
}

/** Activity tasks only. Knowledge and practical tasks complete when their evidence lands. */
export async function setTaskDone(userId: string, taskId: string, done: boolean) {
  const [task] = await db()
    .select()
    .from(dailyTasks)
    .where(and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)));
  if (!task) throw notFound("Task not found");
  if (!isManuallyCompletable(task.kind as TaskKind)) {
    throw conflict(
      "This task completes itself when you finish it in Focus mode — it needs real evidence, not a tick.",
    );
  }
  await db()
    .update(dailyTasks)
    .set(done ? { doneAt: new Date(), completedBy: "manual" } : { doneAt: null, completedBy: null })
    .where(eq(dailyTasks.id, taskId));
  return { ok: true };
}

/** Mark today's evidence-backed tasks for a concept complete when their evidence exists. */
export async function completeTasksByEvidence(
  tx: DbExecutor,
  userId: string,
  conceptId: string,
  kind: TaskKind,
  ref: string,
) {
  await tx
    .update(dailyTasks)
    .set({ doneAt: new Date(), completedBy: "evidence", evidenceRef: ref })
    .where(
      and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.conceptId, conceptId),
        eq(dailyTasks.kind, kind),
        isNull(dailyTasks.doneAt),
      ),
    );
}

/** Coding / mini-project tasks complete once enough exercises are solved. */
export async function syncEvidenceTasks(userId: string, conceptId: string) {
  const criteria = await getCompletionCriteria(conceptId);
  const solved = await db()
    .select({ isProject: exercises.isProject, n: countDistinct(exerciseSubmissions.exerciseId) })
    .from(exerciseSubmissions)
    .innerJoin(exercises, eq(exercises.id, exerciseSubmissions.exerciseId))
    .where(
      and(
        eq(exerciseSubmissions.userId, userId),
        eq(exerciseSubmissions.conceptId, conceptId),
        eq(exerciseSubmissions.solved, true),
      ),
    )
    .groupBy(exercises.isProject);
  const regular = solved.find((s) => !s.isProject)?.n ?? 0;
  const project = solved.find((s) => s.isProject)?.n ?? 0;
  if (regular >= criteria.exercisesRequired)
    await completeTasksByEvidence(db(), userId, conceptId, "coding", "exercises");
  if (project > 0)
    await completeTasksByEvidence(db(), userId, conceptId, "mini_project", "project");
}

/** If today has no plan, carry yesterday's unfinished focus forward. */
async function ensureTodayPlan(userId: string, timezone: string) {
  const today = localDate(new Date(), timezone);
  const [todayPlan] = await db()
    .select()
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)));
  if (todayPlan) return todayPlan;
  const [last] = await db()
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.userId, userId))
    .orderBy(desc(dailyPlans.planDate))
    .limit(1);
  if (!last) return null;
  const [m] = await db()
    .select({ score: conceptMastery.score })
    .from(conceptMastery)
    .where(
      and(
        eq(conceptMastery.userId, userId),
        eq(conceptMastery.conceptId, last.focusConceptId),
        isNull(conceptMastery.subtopicId),
      ),
    );
  if (m && m.score >= MASTERY.passMark) return null;
  try {
    await setTodayFocus(userId, last.focusConceptId);
  } catch {
    return null;
  }
  const [created] = await db()
    .select()
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)));
  return created ?? null;
}

export async function getToday(userId: string, userName: string) {
  const profile = await requireProfile(userId);
  const goal = await getActiveGoal(userId);
  const tz = profile.timezone;
  const today = localDate(new Date(), tz);
  const plan = await ensureTodayPlan(userId, tz);

  let focus: null | {
    conceptId: string;
    title: string;
    moduleTitle: string;
    modulePosition: number;
    indexInModule: number;
    moduleConceptCount: number;
  } = null;
  let tasks: {
    id: string;
    title: string;
    kind: string;
    evidenceKind: string;
    minutes: number;
    done: boolean;
    manual: boolean;
  }[] = [];

  if (plan && goal?.activeRoadmapId) {
    const tree = await loadRoadmapTree(userId, goal.activeRoadmapId);
    const mod = tree.find((m) => m.concepts.some((c) => c.id === plan.focusConceptId));
    const concept = mod?.concepts.find((c) => c.id === plan.focusConceptId);
    if (mod && concept) {
      focus = {
        conceptId: concept.id,
        title: concept.title,
        moduleTitle: mod.title,
        modulePosition: mod.position + 1,
        indexInModule: mod.concepts.indexOf(concept) + 1,
        moduleConceptCount: mod.concepts.length,
      };
    }
    const rows = await db()
      .select()
      .from(dailyTasks)
      .where(eq(dailyTasks.dailyPlanId, plan.id))
      .orderBy(asc(dailyTasks.position));
    tasks = rows.map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind,
      evidenceKind: t.evidenceKind,
      minutes: t.minutes,
      done: t.doneAt !== null,
      manual: isManuallyCompletable(t.kind as TaskKind),
    }));
  }

  const week = weekDates(today);
  const [minutesByDay, xp, streak, stats] = await Promise.all([
    weeklyMinutes(userId, tz, week[0]!),
    totalXp(userId),
    getStreak(userId),
    weekStats(userId, tz, week[0]!),
  ]);
  let recommendation = await activeRecommendation(userId);
  if (!recommendation && goal?.activeRoadmapId) {
    recommendation = await refreshRecommendation(userId).catch(() => null);
  }

  return {
    greetingName: userName.split(" ")[0] ?? userName,
    todayLabel: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: tz,
    }).format(new Date()),
    goal: goal && { id: goal.id, title: goal.title },
    focus,
    tasks,
    streak: visibleStreak(streak, today),
    xp: { total: xp, ...levelProgress(xp) },
    week: week.map((d) => ({ date: d, minutes: minutesByDay.get(d) ?? 0, isToday: d === today })),
    weekTargetMinutes: profile.dailyMinutes * 7,
    stats,
    recommendation: recommendation && toRecommendationView(recommendation),
  };
}
export type TodayView = Awaited<ReturnType<typeof getToday>>;

async function weeklyMinutes(
  userId: string,
  tz: string,
  weekStart: string,
): Promise<Map<string, number>> {
  const rows = await db().execute<{ day: string; secs: string }>(sql`
    select to_char((${studySessions.startedAt} at time zone ${tz})::date, 'YYYY-MM-DD') as day,
           sum(${studySessions.activeSeconds})::text as secs
    from ${studySessions}
    where ${studySessions.userId} = ${userId}
      and (${studySessions.startedAt} at time zone ${tz})::date >= ${weekStart}::date
    group by 1
  `);
  return new Map(rows.map((r) => [r.day, Math.round(Number(r.secs) / 60)]));
}

async function weekStats(userId: string, tz: string, weekStart: string) {
  const [mastered] = await db()
    .select({ n: count() })
    .from(conceptMastery)
    .where(
      and(
        eq(conceptMastery.userId, userId),
        isNull(conceptMastery.subtopicId),
        gte(conceptMastery.score, MASTERY.passMark),
      ),
    );
  const [solved] = await db()
    .select({ n: countDistinct(exerciseSubmissions.exerciseId) })
    .from(exerciseSubmissions)
    .where(and(eq(exerciseSubmissions.userId, userId), eq(exerciseSubmissions.solved, true)));
  const [switches] = await db()
    .select({ n: count() })
    .from(focusEvents)
    .where(
      and(
        eq(focusEvents.userId, userId),
        eq(focusEvents.choice, "change_plan"),
        sql`(${focusEvents.createdAt} at time zone ${tz})::date >= ${weekStart}::date`,
      ),
    );
  return {
    conceptsMastered: mastered?.n ?? 0,
    exercisesSolved: solved?.n ?? 0,
    topicSwitches: switches?.n ?? 0,
  };
}

export async function startStudySession(userId: string, conceptId: string) {
  await ownedConcept(userId, conceptId);
  const [s] = await db()
    .insert(studySessions)
    .values({ userId, conceptId })
    .returning({ id: studySessions.id });
  return { id: s!.id };
}

export async function updateStudySession(
  userId: string,
  id: string,
  activeSeconds: number,
  ended: boolean,
) {
  const [s] = await db()
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)));
  if (!s) throw notFound("Session not found");
  // Can't claim more active time than wall-clock time since the session started.
  const wall =
    Math.floor((Date.now() - s.startedAt.getTime()) / 1000) + SESSION_CLOCK_SLACK_SECONDS;
  await db()
    .update(studySessions)
    .set({
      activeSeconds: Math.min(activeSeconds, wall),
      ...(ended ? { endedAt: new Date() } : {}),
    })
    .where(eq(studySessions.id, id));
  return { ok: true };
}
