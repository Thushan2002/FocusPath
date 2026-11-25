import { and, eq, inArray, ne } from "drizzle-orm";
import type { RoadmapDraft } from "@focuspath/shared";
import type { Database } from "../index";
import {
  completionCriteria,
  conceptMastery,
  conceptPrerequisites,
  concepts,
  goals,
  modules,
  revisionItems,
  roadmaps,
  subtopics,
  taskTemplates,
} from "../schema";

/**
 * Persist a validated roadmap draft into the `generating` roadmap row, mark it ready, supersede
 * the previous version and carry mastery + pending revisions across by concept/subtopic key.
 */
export async function saveRoadmapDraft(
  db: Database,
  input: { roadmapId: string; draft: RoadmapDraft; model: string; promptVersion: string },
): Promise<void> {
  const { roadmapId, draft } = input;

  await db.transaction(async (tx) => {
    const [roadmap] = await tx.select().from(roadmaps).where(eq(roadmaps.id, roadmapId));
    if (!roadmap) throw new Error(`roadmap ${roadmapId} not found`);

    const conceptIdByKey = new Map<string, string>();
    const subtopicIdByKey = new Map<string, Map<string, string>>();
    const prereqPairs: { conceptKey: string; requires: string }[] = [];

    for (const [mi, m] of draft.modules.entries()) {
      const [mod] = await tx
        .insert(modules)
        .values({ roadmapId, position: mi, key: m.key, title: m.title, milestone: m.milestone, estWeeks: m.estWeeks })
        .returning({ id: modules.id });
      for (const [ci, c] of m.concepts.entries()) {
        const [concept] = await tx
          .insert(concepts)
          .values({
            moduleId: mod!.id,
            roadmapId,
            position: ci,
            key: c.key,
            title: c.title,
            summary: c.summary,
            estMinutes: c.estMinutes,
          })
          .returning({ id: concepts.id });
        const conceptId = concept!.id;
        conceptIdByKey.set(c.key, conceptId);

        const subs = await tx
          .insert(subtopics)
          .values(c.subtopics.map((s, si) => ({ conceptId, position: si, key: s.key, title: s.title })))
          .returning({ id: subtopics.id, key: subtopics.key });
        subtopicIdByKey.set(c.key, new Map(subs.map((s) => [s.key, s.id])));

        await tx.insert(completionCriteria).values({ conceptId, ...c.criteria });
        await tx
          .insert(taskTemplates)
          .values(c.taskTemplates.map((t, ti) => ({ conceptId, position: ti, kind: t.kind, title: t.title, minutes: t.minutes })));
        for (const p of c.prerequisites) prereqPairs.push({ conceptKey: c.key, requires: p });
      }
    }

    const prereqRows = prereqPairs.flatMap(({ conceptKey, requires }) => {
      const a = conceptIdByKey.get(conceptKey);
      const b = conceptIdByKey.get(requires);
      return a && b ? [{ conceptId: a, requiresConceptId: b }] : [];
    });
    if (prereqRows.length) await tx.insert(conceptPrerequisites).values(prereqRows);

    // Carry progress over from the previous active version.
    const [goal] = await tx.select().from(goals).where(eq(goals.id, roadmap.goalId));
    if (goal?.activeRoadmapId && goal.activeRoadmapId !== roadmapId) {
      const old = await tx
        .select({ id: concepts.id, key: concepts.key })
        .from(concepts)
        .where(eq(concepts.roadmapId, goal.activeRoadmapId));
      const oldSubs = old.length
        ? await tx
            .select({ id: subtopics.id, key: subtopics.key, conceptId: subtopics.conceptId })
            .from(subtopics)
            .where(inArray(subtopics.conceptId, old.map((o) => o.id)))
        : [];
      for (const o of old) {
        const newId = conceptIdByKey.get(o.key);
        if (!newId) continue;
        const subMap = subtopicIdByKey.get(o.key)!;
        for (const s of oldSubs.filter((s) => s.conceptId === o.id)) {
          const newSub = subMap.get(s.key);
          await tx
            .update(conceptMastery)
            .set({ conceptId: newId, subtopicId: newSub ?? null })
            .where(and(eq(conceptMastery.userId, roadmap.userId), eq(conceptMastery.subtopicId, s.id)));
        }
        await tx
          .update(conceptMastery)
          .set({ conceptId: newId })
          .where(and(eq(conceptMastery.userId, roadmap.userId), eq(conceptMastery.conceptId, o.id)));
        await tx
          .update(revisionItems)
          .set({ conceptId: newId, subtopicId: null })
          .where(and(eq(revisionItems.userId, roadmap.userId), eq(revisionItems.conceptId, o.id)));
      }
    }

    await tx
      .update(roadmaps)
      .set({ status: "superseded" })
      .where(and(eq(roadmaps.goalId, roadmap.goalId), ne(roadmaps.id, roadmapId), eq(roadmaps.status, "ready")));
    await tx
      .update(roadmaps)
      .set({
        status: "ready",
        title: draft.title,
        summary: draft.summary,
        rawJson: draft,
        model: input.model,
        promptVersion: input.promptVersion,
        error: null,
      })
      .where(eq(roadmaps.id, roadmapId));
    await tx.update(goals).set({ activeRoadmapId: roadmapId }).where(eq(goals.id, roadmap.goalId));
  });
}

export async function markRoadmapFailed(db: Database, roadmapId: string, error: string): Promise<void> {
  await db.update(roadmaps).set({ status: "failed", error: error.slice(0, 1000) }).where(eq(roadmaps.id, roadmapId));
}
