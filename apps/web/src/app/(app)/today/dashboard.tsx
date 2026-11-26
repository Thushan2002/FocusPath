"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TASK_KIND_LABELS,
  formatMinutes,
  type EvidenceKind,
  type TaskKind,
} from "@focuspath/shared";
import { ArrowRight, Check, Flame } from "@/components/icons";
import { EvidenceTag } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";
import { endpoints, queryKeys, type TodayView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/routes";
import { WeekChart } from "./week-chart";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard({ initial }: { initial: TodayView }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: t } = useQuery({
    queryKey: queryKeys.today,
    queryFn: endpoints.today.get,
    initialData: initial,
    // Evidence lands on other screens (quiz, focus); always reconcile when the dashboard mounts.
    refetchOnMount: "always",
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => endpoints.tasks.setDone(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: queryKeys.today });
      const prev = qc.getQueryData<TodayView>(queryKeys.today);
      qc.setQueryData<TodayView>(
        queryKeys.today,
        (old) => old && { ...old, tasks: old.tasks.map((x) => (x.id === id ? { ...x, done } : x)) },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(queryKeys.today, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.today }),
  });

  const startQuiz = useMutation({
    mutationFn: endpoints.concepts.createQuiz,
    onSuccess: ({ id }) => router.push(paths.quiz(id)),
  });
  const startRevision = useMutation({
    mutationFn: endpoints.revisions.start,
    onSuccess: ({ id }) => router.push(paths.quiz(id)),
  });
  const setFocus = useMutation({
    mutationFn: endpoints.focus.set,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.today }),
  });

  const done = t.tasks.filter((x) => x.done).length;
  const pct = t.tasks.length ? Math.round((done / t.tasks.length) * 100) : 0;
  const totalMin = t.tasks.reduce((s, x) => s + x.minutes, 0);
  const weekMin = t.week.reduce((s, d) => s + d.minutes, 0);
  const rec = t.recommendation;
  const busy = startQuiz.isPending || startRevision.isPending || setFocus.isPending;
  const actionError = startQuiz.error ?? startRevision.error ?? setFocus.error ?? toggle.error;

  function recAction() {
    if (!rec) return;
    if (rec.kind === "revise" && rec.revisionItemId) startRevision.mutate(rec.revisionItemId);
    else if (rec.kind === "practice") router.push(`/focus/${rec.conceptId}`);
    else if (rec.kind === "learn" && rec.conceptId !== t.focus?.conceptId)
      setFocus.mutate(rec.conceptId);
    else if (rec.kind === "learn") router.push(`/focus/${rec.conceptId}`);
    else router.push("/roadmap");
  }
  const recLabel =
    rec?.kind === "revise"
      ? `Start ${rec.estMinutes}-min recall`
      : rec?.kind === "practice"
        ? "Start practice"
        : rec?.kind === "learn"
          ? rec.conceptId === t.focus?.conceptId
            ? "Continue"
            : "Make it today's focus"
          : "Open roadmap";

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[30px] font-bold tracking-[-0.02em]">
            {greeting()}, {t.greetingName}
          </h1>
          <p className="m-0 text-[15px] text-muted">
            {t.todayLabel}
            {t.goal && (
              <>
                {" "}
                · Goal:{" "}
                <Link href="/roadmap" className="font-semibold">
                  {t.goal.title}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <div className="flex h-11 items-center gap-2 rounded-full bg-warning-soft px-3.5 text-sm font-semibold text-warning-ink">
            <Flame />
            {t.streak}-day streak
          </div>
          <div
            className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold"
            title={`${t.xp.next - t.xp.total} XP to level ${t.xp.level + 1}`}
          >
            <span className="text-primary-ink">{t.xp.total.toLocaleString("en-GB")} XP</span>
            <span className="font-medium text-muted">· Level {t.xp.level}</span>
          </div>
        </div>
      </header>

      {actionError && <Alert>{actionError.message}</Alert>}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <section
            aria-label="Today's focus"
            className="flex flex-col gap-5 rounded-3xl bg-panel p-7 text-white"
          >
            {t.focus ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="eyebrow text-panel-muted">Today&apos;s focus</span>
                    <h2 className="m-0 text-[28px] font-bold tracking-[-0.01em]">
                      {t.focus.title}
                    </h2>
                    <p className="m-0 text-[15px] text-panel-text">
                      Module {t.focus.modulePosition} · {t.focus.moduleTitle} · concept{" "}
                      {t.focus.indexInModule} of {t.focus.moduleConceptCount}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[32px] font-bold">
                      {done}/{t.tasks.length}
                    </span>
                    <span className="text-[13px] text-panel-text">
                      tasks · ≈ {formatMinutes(totalMin)}
                    </span>
                  </div>
                </div>
                <div
                  className="h-2 rounded bg-panel-3"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label="Today's progress"
                >
                  <div
                    className="h-2 rounded bg-accent transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <Button
                  asChild
                  variant="white"
                  className="h-12 self-start rounded-lg px-[22px] text-[15px] font-bold"
                >
                  <Link href={`/focus/${t.focus.conceptId}`}>
                    Start focus session
                    <ArrowRight />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <span className="eyebrow text-panel-muted">Today&apos;s focus</span>
                <h2 className="m-0 text-[26px] font-bold">Pick one concept to focus on today</h2>
                <p className="m-0 text-[15px] text-panel-text">
                  Open your roadmap, choose a concept and set it as today&apos;s focus. Your tasks
                  will appear here.
                </p>
                <Button
                  asChild
                  variant="white"
                  className="h-12 self-start rounded-lg px-[22px] font-bold"
                >
                  <Link href="/roadmap">
                    Open roadmap
                    <ArrowRight />
                  </Link>
                </Button>
              </>
            )}
          </section>

          {t.focus && (
            <section
              aria-label="Today's tasks"
              className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-6"
            >
              <h2 className="m-0 mb-2 text-lg font-bold">Today&apos;s tasks</h2>
              {t.tasks.map((task) => {
                const meta = `${TASK_KIND_LABELS[task.kind as TaskKind]} · ${formatMinutes(task.minutes)}`;
                const text = (
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-[15px] font-medium",
                        task.done ? "text-muted line-through" : "text-ink",
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="text-[13px] text-muted">
                      {meta}
                      {!task.manual && !task.done && " · completes when you finish it"}
                    </span>
                  </span>
                );
                const rowClass =
                  "flex min-h-14 items-center gap-3.5 rounded-lg border border-line-soft px-3 py-2";
                if (task.manual) {
                  return (
                    <label key={task.id} className={cn(rowClass, "cursor-pointer hover:bg-bg")}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggle.mutate({ id: task.id, done: !task.done })}
                        className="h-5 w-5 flex-none accent-primary"
                      />
                      {text}
                      <EvidenceTag kind={task.evidenceKind as EvidenceKind} />
                    </label>
                  );
                }
                const indicator = (
                  <span
                    aria-label={task.done ? "Done" : "Not done yet"}
                    className={cn(
                      "flex h-5 w-5 flex-none items-center justify-center rounded",
                      task.done ? "bg-primary text-white" : "border-2 border-field",
                    )}
                  >
                    {task.done && <Check size={14} />}
                  </span>
                );
                if (task.kind === "assessment") {
                  return (
                    <button
                      key={task.id}
                      type="button"
                      disabled={busy}
                      onClick={() => startQuiz.mutate(t.focus!.conceptId)}
                      className={cn(rowClass, "text-left hover:bg-bg")}
                    >
                      {indicator}
                      {text}
                      <EvidenceTag kind={task.evidenceKind as EvidenceKind} />
                    </button>
                  );
                }
                return (
                  <Link
                    key={task.id}
                    href={`/focus/${t.focus!.conceptId}`}
                    className={cn(rowClass, "no-underline hover:bg-bg")}
                  >
                    {indicator}
                    {text}
                    <EvidenceTag kind={task.evidenceKind as EvidenceKind} />
                  </Link>
                );
              })}
            </section>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          {rec && (
            <section
              aria-label="Recommended next"
              className="flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-6"
            >
              <span className="eyebrow text-primary-ink">Recommended next</span>
              <h2 className="m-0 text-lg font-bold">{rec.title}</h2>
              <p className="m-0 text-sm leading-[1.55] text-ink-2">{rec.detail}</p>
              <div className="rounded-lg bg-bg px-3.5 py-3 text-[13px] leading-normal text-ink-2">
                <strong className="text-ink">Why this?</strong> {rec.reason}
              </div>
              <Button
                variant="outline-primary"
                className="rounded-md"
                onClick={recAction}
                disabled={busy}
              >
                {recLabel}
              </Button>
            </section>
          )}

          <section
            aria-label="This week"
            className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="m-0 text-lg font-bold">This week</h2>
              <span className="text-[13px] text-muted">
                {formatMinutes(weekMin)} of {formatMinutes(t.weekTargetMinutes)}
              </span>
            </div>
            <WeekChart week={t.week} />
            <div className="grid grid-cols-3 gap-2 border-t border-line-soft pt-3">
              {[
                [t.stats.conceptsMastered, "concepts mastered"],
                [t.stats.exercisesSolved, "exercises solved"],
                [t.stats.topicSwitches, "topic switches"],
              ].map(([n, label]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xl font-bold">{n}</span>
                  <span className="text-xs text-muted">{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
