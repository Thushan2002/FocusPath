import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { tutorMessages } from "@focuspath/db";
import type { TutorBlock, TutorMode } from "@focuspath/shared";
import { ai } from "../ai";
import { db } from "../db";
import { getConceptContext } from "./concept";
import { buildLearnerContext } from "./learner-context";
import { ownedConcept, ownedExercise } from "./ownership";

/** Concept-scoped AI tutor chat, grounded in the learner's context. */

const HISTORY_LIMIT = 30;
/** How many recent turns are sent to the model. */
const CONTEXT_TURNS = 10;

type MessageContent = (typeof tutorMessages.$inferSelect)["content"];

export interface TutorMessageView {
  id: string;
  role: "user" | "assistant";
  content: MessageContent;
}

export async function tutorHistory(userId: string, conceptId: string): Promise<TutorMessageView[]> {
  await ownedConcept(userId, conceptId);
  const rows = await db()
    .select()
    .from(tutorMessages)
    .where(and(eq(tutorMessages.userId, userId), eq(tutorMessages.conceptId, conceptId)))
    .orderBy(desc(tutorMessages.createdAt))
    .limit(HISTORY_LIMIT);
  return rows.reverse().map((m) => ({ id: m.id, role: m.role, content: m.content }));
}

/** Flattens rich blocks to plain text for the model's conversation history. */
function blocksToText(blocks: readonly TutorBlock[]): string {
  return blocks.map((b) => (b.type === "text" ? b.text : `\`\`\`\n${b.code}\n\`\`\``)).join("\n");
}

export async function sendTutorMessage(
  userId: string,
  input: { conceptId: string; exerciseId: string | null; message: string; mode: TutorMode },
): Promise<TutorMessageView> {
  await ownedConcept(userId, input.conceptId);
  const [ctx, ex, history] = await Promise.all([
    getConceptContext(input.conceptId),
    input.exerciseId ? ownedExercise(userId, input.exerciseId) : null,
    tutorHistory(userId, input.conceptId),
  ]);

  const reply = await ai().tutorReply({
    learner: await buildLearnerContext(userId, input.conceptId, ctx.title),
    concept: ctx,
    exercise: ex && { title: ex.title, prompt: ex.prompt },
    history: history
      .slice(-CONTEXT_TURNS)
      .map((h) => ({ role: h.role, text: blocksToText(h.content.blocks) })),
    message: input.message,
    mode: input.mode,
  });

  const base = { userId, conceptId: input.conceptId, exerciseId: input.exerciseId };
  const [, assistant] = await db()
    .insert(tutorMessages)
    .values([
      { ...base, role: "user", content: { blocks: [{ type: "text", text: input.message }] } },
      { ...base, role: "assistant", content: reply },
    ])
    .returning();
  return { id: assistant!.id, role: "assistant", content: reply };
}
