import type { ConceptStatus } from "../enums";

export interface ConceptStatusInput {
  id: string;
  prerequisiteIds: string[];
  mastery: number | null;
  hasEvidence: boolean;
}

/**
 * Status is derived, never stored:
 * - mastered: mastery estimate at or above the pass mark
 * - in_progress: today's focus, or any evidence recorded
 * - locked: some prerequisite hasn't been started (is itself up next or locked)
 * - up_next: everything else
 * Concepts must be given in roadmap order (prerequisites come earlier).
 */
export function deriveConceptStatuses(
  concepts: ConceptStatusInput[],
  focusConceptId: string | null,
  passMark: number,
): Map<string, ConceptStatus> {
  const out = new Map<string, ConceptStatus>();
  for (const c of concepts) {
    if (c.mastery !== null && c.mastery >= passMark) {
      out.set(c.id, "mastered");
      continue;
    }
    if (c.id === focusConceptId || c.hasEvidence) {
      out.set(c.id, "in_progress");
      continue;
    }
    const blocked = c.prerequisiteIds.some((p) => {
      const s = out.get(p);
      return s === undefined || s === "locked" || s === "up_next";
    });
    out.set(c.id, blocked ? "locked" : "up_next");
  }
  return out;
}
