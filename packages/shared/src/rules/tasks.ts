import { EVIDENCE_FOR_TASK_KIND, type EvidenceKind, type TaskKind } from "../enums";

export interface TaskTemplate {
  kind: TaskKind;
  title: string;
  minutes: number;
}

export interface PlannedTask extends TaskTemplate {
  evidenceKind: EvidenceKind;
  position: number;
}

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/**
 * Turn a concept's task templates into today's plan, scaled to fit the learner's daily time.
 * Only scales down — a short concept on a long day stays short.
 */
export function planDailyTasks(templates: TaskTemplate[], dailyMinutes: number): PlannedTask[] {
  const total = templates.reduce((s, t) => s + t.minutes, 0);
  const factor = total > dailyMinutes ? dailyMinutes / total : 1;
  return templates.map((t, position) => ({
    ...t,
    minutes: roundTo5(t.minutes * factor),
    evidenceKind: EVIDENCE_FOR_TASK_KIND[t.kind],
    position,
  }));
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
