import { describe, expect, it } from "vitest";
import { addDays, daysBetween, localDate, weekDates } from "./dates";
import { applyEvidenceDay, visibleStreak } from "./streak";
import { deriveConceptStatuses } from "./concept-status";
import { formatMinutes, planDailyTasks } from "./tasks";
import { levelForXp, levelProgress } from "./xp";
import { isManuallyCompletable } from "../enums";

describe("xp levels", () => {
  it("matches the design: 1,240 XP is level 4", () => {
    expect(levelForXp(1240)).toBe(4);
  });
  it("level boundaries", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(400)).toBe(3);
    expect(levelProgress(1240)).toEqual({ level: 4, floor: 900, next: 1600 });
  });
});

describe("streaks", () => {
  const empty = { current: 0, longest: 0, lastEvidenceDate: null };
  it("starts, continues, and resets", () => {
    let s = applyEvidenceDay(empty, "2026-11-01");
    expect(s.current).toBe(1);
    s = applyEvidenceDay(s, "2026-11-01");
    expect(s.current).toBe(1);
    s = applyEvidenceDay(s, "2026-11-02");
    expect(s).toEqual({ current: 2, longest: 2, lastEvidenceDate: "2026-11-02" });
    s = applyEvidenceDay(s, "2026-11-05");
    expect(s).toEqual({ current: 1, longest: 2, lastEvidenceDate: "2026-11-05" });
  });
  it("is visible through the following day only", () => {
    const s = { current: 6, longest: 6, lastEvidenceDate: "2026-11-02" };
    expect(visibleStreak(s, "2026-11-02")).toBe(6);
    expect(visibleStreak(s, "2026-11-03")).toBe(6);
    expect(visibleStreak(s, "2026-11-04")).toBe(0);
  });
});

describe("dates", () => {
  it("handles month boundaries and timezones", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(daysBetween("2026-10-29", "2026-11-01")).toBe(3);
    // 23:30 UTC on Oct 31 is already Nov 1 in Colombo (+05:30)
    expect(localDate(new Date("2026-10-31T23:30:00Z"), "Asia/Colombo")).toBe("2026-11-01");
    expect(localDate(new Date("2026-10-31T23:30:00Z"), "Not/AZone")).toBe("2026-10-31");
  });
  it("weeks start on Sunday", () => {
    const w = weekDates("2026-10-31"); // a Saturday
    expect(w[0]).toBe("2026-10-25");
    expect(w[6]).toBe("2026-10-31");
  });
});

describe("concept status", () => {
  const pass = 70;
  it("reproduces the roadmap design states", () => {
    const s = deriveConceptStatuses(
      [
        { id: "vars", prerequisiteIds: [], mastery: 92, hasEvidence: true },
        { id: "loops", prerequisiteIds: ["vars"], mastery: 81, hasEvidence: true },
        { id: "fn", prerequisiteIds: ["loops"], mastery: 40, hasEvidence: true },
        { id: "oop", prerequisiteIds: ["fn"], mastery: null, hasEvidence: false },
        { id: "files", prerequisiteIds: ["fn", "oop"], mastery: null, hasEvidence: false },
      ],
      null,
      pass,
    );
    expect([...s.values()]).toEqual(["mastered", "mastered", "in_progress", "up_next", "locked"]);
  });
  it("today's focus is in progress even without evidence", () => {
    const s = deriveConceptStatuses([{ id: "a", prerequisiteIds: [], mastery: null, hasEvidence: false }], "a", pass);
    expect(s.get("a")).toBe("in_progress");
  });
});

describe("daily tasks", () => {
  const templates = [
    { kind: "learn" as const, title: "Learn", minutes: 40 },
    { kind: "coding" as const, title: "Code", minutes: 70 },
    { kind: "assessment" as const, title: "Quiz", minutes: 10 },
  ];
  it("keeps a plan that already fits", () => {
    const p = planDailyTasks(templates, 120);
    expect(p.map((t) => t.minutes)).toEqual([40, 70, 10]);
    expect(p.map((t) => t.evidenceKind)).toEqual(["activity", "practical", "knowledge"]);
  });
  it("scales down to the learner's time", () => {
    const p = planDailyTasks(templates, 30);
    expect(p.reduce((s, t) => s + t.minutes, 0)).toBeLessThanOrEqual(35);
    expect(p.every((t) => t.minutes >= 5)).toBe(true);
  });
  it("only activity tasks are manual", () => {
    expect(isManuallyCompletable("learn")).toBe(true);
    expect(isManuallyCompletable("coding")).toBe(false);
    expect(isManuallyCompletable("assessment")).toBe(false);
  });
  it("formats minutes", () => {
    expect(formatMinutes(110)).toBe("1 h 50 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(25)).toBe("25 min");
  });
});
