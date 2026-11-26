import "server-only";
import { explanations } from "@focuspath/db";
import { EXPLANATION_ACCEPT_SCORE } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { getConceptContext } from "./concept";
import { awardXp } from "./engagement";
import { recomputeMastery } from "./mastery";
import { ownedConcept } from "./ownership";
import { completeTasksByEvidence } from "./plan";
import { getLearnerSettings } from "./profile";

/** Knowledge evidence: "explain it in your own words", graded by the AI against a rubric. */
export async function submitExplanation(userId: string, conceptId: string, text: string) {
  await ownedConcept(userId, conceptId);
  const [ctx, settings] = await Promise.all([
    getConceptContext(conceptId),
    getLearnerSettings(userId),
  ]);
  const evaluation = await ai().evaluateExplanation({ concept: ctx, level: settings.level, text });
  const accepted = evaluation.score >= EXPLANATION_ACCEPT_SCORE;

  const xp = await db().transaction(async (tx) => {
    const [row] = await tx
      .insert(explanations)
      .values({
        userId,
        conceptId,
        text,
        aiScore: evaluation.score,
        rubric: evaluation.rubric,
        feedback: evaluation.feedback,
        misconceptions: evaluation.misconceptions,
      })
      .returning({ id: explanations.id });
    if (!accepted) return 0;
    await completeTasksByEvidence(tx, userId, conceptId, "explain", `explanation:${row!.id}`);
    // One explanation XP award per concept, so rewording the same idea can't farm XP.
    return awardXp(
      tx,
      userId,
      "explanation_accepted",
      `explanation:${conceptId}`,
      settings.timezone,
    );
  });
  await recomputeMastery(userId, conceptId).catch((e) =>
    console.error("mastery recompute failed", e),
  );
  return { ...evaluation, accepted, xpAwarded: xp };
}
export type ExplanationResult = Awaited<ReturnType<typeof submitExplanation>>;
