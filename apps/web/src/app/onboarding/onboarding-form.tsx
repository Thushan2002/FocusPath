"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DAILY_MINUTES_OPTIONS,
  GOAL_SUGGESTIONS,
  LEVEL_OPTIONS,
  STRUGGLES,
  STRUGGLE_LABELS,
  TARGET_MONTHS_OPTIONS,
  type Level,
  type Struggle,
} from "@focuspath/shared";
import { ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";
import { endpoints } from "@/lib/api";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/routes";

const chip = (on: boolean) =>
  cn(
    "h-11 rounded-full border-[1.5px] px-4 text-sm font-medium",
    on ? "border-primary bg-primary text-white" : "border-field bg-surface text-ink hover:bg-bg",
  );
const selectClass =
  "h-12 rounded-lg border-[1.5px] border-field bg-surface px-3 text-[15px] text-ink";

interface Initial {
  level: Level;
  priorKnowledge: string;
  dailyMinutes: number;
  targetMonths: number;
  struggle: Struggle;
}

export function OnboardingForm({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>(initial?.level ?? "beginner");
  const [known, setKnown] = useState(initial?.priorKnowledge ?? "");
  const [minutes, setMinutes] = useState(initial?.dailyMinutes ?? 120);
  const [months, setMonths] = useState(initial?.targetMonths ?? 6);
  const [struggle, setStruggle] = useState<Struggle>(initial?.struggle ?? "inconsistency");

  const submit = useMutation({
    mutationFn: () =>
      endpoints.onboarding.submit({
        goal,
        level,
        priorKnowledge: known,
        dailyMinutes: minutes,
        targetMonths: months,
        struggle,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    onSuccess: ({ roadmapId }) => router.push(paths.roadmapGenerating(roadmapId)),
  });

  const levelLabel = LEVEL_OPTIONS.find((l) => l.value === level)!.label;
  const minutesLabel =
    DAILY_MINUTES_OPTIONS.find((o) => o.value === minutes)?.label ?? `${minutes} min`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
      className="flex min-w-0 flex-[999_1_560px] flex-col gap-8 rounded-3xl border border-line bg-surface p-[clamp(20px,3vw,36px)]"
    >
      <section className="flex flex-col gap-3">
        <label htmlFor="goal" className="text-base font-semibold">
          What do you want to become or master?
        </label>
        <input
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Become an AI Engineer"
          maxLength={120}
          className="h-[52px] rounded-lg border-[1.5px] border-field bg-surface px-4 text-base text-ink"
        />
        <div className="flex flex-wrap gap-2">
          {GOAL_SUGGESTIONS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={goal === g}
              onClick={() => setGoal(g)}
              className={chip(goal === g)}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <span id="level-label" className="text-base font-semibold">
          Where are you starting from?
        </span>
        <div
          role="group"
          aria-labelledby="level-label"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {LEVEL_OPTIONS.map((l) => {
            const on = level === l.value;
            return (
              <button
                key={l.value}
                type="button"
                aria-pressed={on}
                onClick={() => setLevel(l.value)}
                className={cn(
                  "flex min-h-24 flex-col items-start gap-1.5 rounded-xl p-4 text-left",
                  on
                    ? "border-2 border-primary bg-primary-soft"
                    : "border-[1.5px] border-field bg-surface hover:bg-bg",
                )}
              >
                <span className="text-[15px] font-semibold text-ink">{l.label}</span>
                <span className="text-[13px] leading-[1.45] text-muted">{l.desc}</span>
              </button>
            );
          })}
        </div>
        <label htmlFor="known" className="mt-1 text-sm text-muted">
          What do you already know? (optional)
        </label>
        <input
          id="known"
          value={known}
          onChange={(e) => setKnown(e.target.value)}
          maxLength={300}
          placeholder="e.g. Python basics — variables, loops"
          className="h-12 rounded-lg border-[1.5px] border-field px-4 text-[15px] text-ink"
        />
      </section>

      <section className="flex flex-col gap-3">
        <span id="time-label" className="text-base font-semibold">
          How much time can you give each day — realistically?
        </span>
        <div role="group" aria-labelledby="time-label" className="flex flex-wrap gap-2">
          {DAILY_MINUTES_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={minutes === o.value}
              onClick={() => setMinutes(o.value)}
              className={chip(minutes === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="dur" className="text-sm text-muted">
              Target duration
            </label>
            <select
              id="dur"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className={selectClass}
            >
              {TARGET_MONTHS_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="struggle" className="text-sm text-muted">
              Biggest struggle so far
            </label>
            <select
              id="struggle"
              value={struggle}
              onChange={(e) => setStruggle(e.target.value as Struggle)}
              className={selectClass}
            >
              {STRUGGLES.map((s) => (
                <option key={s} value={s}>
                  {STRUGGLE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {submit.error && <Alert>{submit.error.message}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <p className="m-0 max-w-[420px] text-sm leading-normal text-muted">
          {goal || "Your goal"} · {levelLabel} · {minutesLabel} a day. We&apos;ll start with what
          you&apos;re missing, not what you already know.
        </p>
        <Button type="submit" size="lg" disabled={goal.trim().length < 3 || submit.isPending}>
          {submit.isPending ? "Starting…" : "Generate my roadmap"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
