import "server-only";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { exerciseSubmissions, exercises, hintRequests, taskTemplates } from "@focuspath/db";
import { MAX_HINT_LEVEL, usedAnswerHint, type TestResult } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { conflict } from "../errors";
import { getCompletionCriteria, getConceptContext, getSubtopicIndex } from "./concept";
import { awardXp } from "./engagement";
import { buildLearnerContext } from "./learner-context";
import { recomputeMastery } from "./mastery";
import { ownedConcept, ownedExercise } from "./ownership";
import { syncEvidenceTasks } from "./plan";
import { getLearnerSettings } from "./profile";

/**
 * Practical evidence: AI-generated coding exercises, test-checked submissions and progressive hints.
 */

export interface HintView {
  level: number;
  text: string;
}

/** An exercise as the browser sees it. The reference solution never leaves the server. */
export interface ExerciseView {
  id: string;
  title: string;
  prompt: string;
  starterCode: string;
  tests: (typeof exercises.$inferSelect)["tests"];
  isProject: boolean;
  position: number;
  solved: boolean;
  attempted: boolean;
  hints: HintView[];
}

export async function listExercises(userId: string, conceptId: string): Promise<ExerciseView[]> {
  await ownedConcept(userId, conceptId);
  let rows = await db()
    .select()
    .from(exercises)
    .where(and(eq(exercises.userId, userId), eq(exercises.conceptId, conceptId)))
    .orderBy(asc(exercises.position));

  if (!rows.length) rows = await generateExercises(userId, conceptId);

  const ids = rows.map((r) => r.id);
  const [subs, hints] = await Promise.all([
    db()
      .select({ exerciseId: exerciseSubmissions.exerciseId, solved: exerciseSubmissions.solved })
      .from(exerciseSubmissions)
      .where(
        and(eq(exerciseSubmissions.userId, userId), inArray(exerciseSubmissions.exerciseId, ids)),
      ),
    db()
      .select()
      .from(hintRequests)
      .where(and(eq(hintRequests.userId, userId), inArray(hintRequests.exerciseId, ids)))
      .orderBy(asc(hintRequests.level)),
  ]);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    prompt: r.prompt,
    starterCode: r.starterCode,
    tests: r.tests,
    isProject: r.isProject,
    position: r.position,
    solved: subs.some((s) => s.exerciseId === r.id && s.solved),
    attempted: subs.some((s) => s.exerciseId === r.id),
    hints: hints.filter((h) => h.exerciseId === r.id).map(toHintView),
  }));
}

const toHintView = (h: { level: number; text: string }): HintView => ({
  level: h.level,
  text: h.text,
});

async function generateExercises(userId: string, conceptId: string) {
  const [ctx, settings, criteria, templates, index] = await Promise.all([
    getConceptContext(conceptId),
    getLearnerSettings(userId),
    getCompletionCriteria(conceptId),
    db()
      .select({ kind: taskTemplates.kind })
      .from(taskTemplates)
      .where(eq(taskTemplates.conceptId, conceptId)),
    getSubtopicIndex(conceptId),
  ]);
  const learner = await buildLearnerContext(userId, conceptId, ctx.title);
  const out = await ai().generateExercises({
    concept: ctx,
    level: settings.level,
    count: criteria.exercisesRequired,
    includeProject: templates.some((t) => t.kind === "mini_project"),
    recentMistakes: learner.recentMistakes,
  });
  return db()
    .insert(exercises)
    .values(
      out.exercises.map((e, i) => ({
        userId,
        conceptId,
        subtopicId: index.idOf(e.subtopicKey),
        position: i,
        title: e.title,
        prompt: e.prompt,
        starterCode: e.starterCode,
        tests: e.tests,
        solution: e.solution,
        isProject: e.isProject,
      })),
    )
    .returning();
}

async function maxHintLevelUsed(userId: string, exerciseId: string): Promise<number> {
  const [row] = await db()
    .select({ lvl: max(hintRequests.level) })
    .from(hintRequests)
    .where(and(eq(hintRequests.userId, userId), eq(hintRequests.exerciseId, exerciseId)));
  return row?.lvl ?? 0;
}

/**
 * Record a submission. "Solved" requires every one of the exercise's tests to be reported as
 * passing. Hint usage comes from hint_requests, never from the client.
 */
export async function submitExercise(
  userId: string,
  exerciseId: string,
  code: string,
  results: TestResult[],
) {
  const ex = await ownedExercise(userId, exerciseId);
  const [settings, maxHint] = await Promise.all([
    getLearnerSettings(userId),
    maxHintLevelUsed(userId, exerciseId),
  ]);
  const byName = new Map(results.map((r) => [r.name, r]));
  const testsPassed = ex.tests.filter((t) => byName.get(t.name)?.passed).length;
  const solved = testsPassed === ex.tests.length && ex.tests.length > 0;
  const answerHint = usedAnswerHint(maxHint);

  const { submissionId, xp } = await db().transaction(async (tx) => {
    const [sub] = await tx
      .insert(exerciseSubmissions)
      .values({
        exerciseId,
        userId,
        conceptId: ex.conceptId,
        code,
        testsPassed,
        testsTotal: ex.tests.length,
        solved,
        maxHintLevelUsed: maxHint,
        results: ex.tests.map(
          (t) => byName.get(t.name) ?? { name: t.name, passed: false, message: "Not run" },
        ),
      })
      .returning({ id: exerciseSubmissions.id });
    // Keyed by exercise: only the first solve pays.
    const xp = solved
      ? await awardXp(
          tx,
          userId,
          answerHint ? "exercise_solved_with_answer_hint" : "exercise_solved",
          `exercise:${exerciseId}`,
          settings.timezone,
        )
      : 0;
    return { submissionId: sub!.id, xp };
  });

  if (solved) {
    await syncEvidenceTasks(userId, ex.conceptId);
    await recomputeMastery(userId, ex.conceptId).catch((e) =>
      console.error("mastery recompute failed", e),
    );
  }
  return {
    submissionId,
    solved,
    testsPassed,
    testsTotal: ex.tests.length,
    xpAwarded: xp,
    usedAnswerHint: answerHint,
  };
}
export type SubmissionResult = Awaited<ReturnType<typeof submitExercise>>;

/** Progressive hints: one level at a time; the last level is the answer-revealing "final hint". */
export async function requestHint(
  userId: string,
  exerciseId: string,
  currentCode: string,
  lastError: string | null,
) {
  const ex = await ownedExercise(userId, exerciseId);
  const previous = await db()
    .select()
    .from(hintRequests)
    .where(and(eq(hintRequests.userId, userId), eq(hintRequests.exerciseId, exerciseId)))
    .orderBy(asc(hintRequests.level));
  const level = previous.length + 1;
  if (level > MAX_HINT_LEVEL) throw conflict("All hints for this exercise are already shown");

  const ctx = await getConceptContext(ex.conceptId);
  const hint = await ai().hint({
    learner: await buildLearnerContext(userId, ex.conceptId, ctx.title),
    exercise: {
      title: ex.title,
      prompt: ex.prompt,
      starterCode: ex.starterCode,
      solution: ex.solution,
    },
    level,
    previousHints: previous.map((p) => p.text),
    currentCode,
    lastError,
  });
  await db().insert(hintRequests).values({ exerciseId, userId, level, text: hint.hint });
  return { hints: [...previous.map(toHintView), { level, text: hint.hint }] };
}
export type HintsResult = Awaited<ReturnType<typeof requestHint>>;
