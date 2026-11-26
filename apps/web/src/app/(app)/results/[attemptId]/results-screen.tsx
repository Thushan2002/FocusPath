"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MASTERY, formatMinutes } from "@focuspath/shared";
import { Chevron } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";
import { endpoints, type RecommendationView, type ResultsView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/routes";

function Bar({ score, pass }: { score: number; pass: number }) {
  const weak = score < pass;
  return (
    <div className="relative h-2.5 rounded-[5px] bg-line-soft">
      <div
        className="h-2.5 rounded-[5px]"
        style={{ width: `${Math.max(2, score)}%`, background: weak ? "#C2620E" : "#0D6E5F" }}
      />
      <div
        className="absolute -top-[3px] h-4 w-0.5 bg-muted"
        style={{ left: `${pass}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const dueLabel = (iso: string) => {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

/**
 * Carry out a recommendation and return where to go next. One branch per recommendation kind;
 * unknown or missing recommendations fall back to the roadmap.
 */
async function followRecommendation(rec: RecommendationView | null): Promise<string> {
  if (!rec) return paths.roadmap;
  switch (rec.kind) {
    case "revise":
      return rec.revisionItemId
        ? paths.quiz((await endpoints.revisions.start(rec.revisionItemId)).id)
        : paths.roadmap;
    case "learn":
      await endpoints.focus.set(rec.conceptId);
      return paths.today;
    case "practice":
      return paths.focus(rec.conceptId);
    default:
      return paths.roadmap;
  }
}

export function ResultsScreen({ r }: { r: ResultsView }) {
  const router = useRouter();
  const [how, setHow] = useState(false);
  const rec = r.recommendation;
  const parts = r.parts.filter((p) => p.score !== null) as {
    id: string;
    title: string;
    score: number;
  }[];

  const action = useMutation({
    mutationFn: () => followRecommendation(rec),
    onSuccess: (href) => router.push(href),
  });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-primary-ink">Assessment complete</span>
          <h1 className="m-0 text-[30px] font-bold tracking-[-0.02em]">
            {r.concept.title} — results
          </h1>
          <p className="m-0 text-[15px] text-muted">
            {r.counts.questions} questions · {r.counts.exercises} coding exercise
            {r.counts.exercises === 1 ? "" : "s"} · {r.counts.explanations} written explanation
            {r.counts.explanations === 1 ? "" : "s"}
          </p>
        </div>
        {r.xpEarned > 0 && (
          <div className="flex h-11 items-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-ink">
            +{r.xpEarned} XP
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <section
            aria-label="Concept breakdown"
            className="flex flex-col gap-[18px] rounded-3xl border border-line bg-surface p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 text-lg font-bold">How well you know each part</h2>
              <span className="text-[13px] text-muted">
                Mastery estimate · line = ready to move on
              </span>
            </div>
            {r.mastery && (
              <div className="flex flex-col gap-2 border-b border-line-soft pb-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-bold">{r.concept.title} overall</span>
                  <span className="flex items-center gap-2.5">
                    {r.mastery.score < r.passMark && (
                      <span className="rounded-full bg-warning-soft px-2.5 py-[3px] text-xs font-semibold text-warning-ink">
                        Not proven yet
                      </span>
                    )}
                    <span className="min-w-11 text-right text-[15px] font-bold">
                      {r.mastery.score}%
                    </span>
                  </span>
                </div>
                <Bar score={r.mastery.score} pass={r.passMark} />
              </div>
            )}
            {parts.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold">{p.title}</span>
                  <span className="flex items-center gap-2.5">
                    {p.score < r.passMark && (
                      <span className="rounded-full bg-warning-soft px-2.5 py-[3px] text-xs font-semibold text-warning-ink">
                        Needs practice
                      </span>
                    )}
                    <span className="min-w-11 text-right text-[15px] font-bold">{p.score}%</span>
                  </span>
                </div>
                <Bar score={p.score} pass={r.passMark} />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setHow((h) => !h)}
              aria-expanded={how}
              className="flex h-10 items-center gap-1.5 self-start text-sm font-semibold text-primary-ink"
            >
              How is this calculated?
              <Chevron size={16} className={cn("transition-transform", how && "rotate-180")} />
            </button>
            {how && (
              <div className="flex flex-col gap-2 rounded-lg bg-bg px-4 py-3.5 text-sm leading-relaxed text-ink-2">
                <p className="m-0">
                  Each concept&apos;s estimate weighs quiz answers ({MASTERY.weights.quiz * 100}%),
                  coding exercises solved without the final hint ({MASTERY.weights.practical * 100}
                  %) and your written explanation ({MASTERY.weights.explanation * 100}%). More
                  recent evidence counts more. Missing evidence counts as zero, so one quiz alone
                  can&apos;t move a concept past the {r.passMark}% line. It&apos;s an estimate, not
                  a grade — one quiz can&apos;t prove full understanding.
                </p>
                {r.mastery && (
                  <p className="m-0 font-mono text-[13px]">
                    0.4 × {pct(r.mastery.components.quiz)} + 0.4 ×{" "}
                    {pct(r.mastery.components.practical)} + 0.2 ×{" "}
                    {pct(r.mastery.components.explanation)} = {r.mastery.score}%
                    <span className="text-muted"> · {r.mastery.calcVersion}</span>
                  </p>
                )}
                <p className="m-0 text-[13px] text-muted">
                  Part scores use whatever evidence exists for that part, weighted the same way.
                </p>
              </div>
            )}
          </section>

          <section
            aria-label="Evidence"
            className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6"
          >
            <h2 className="m-0 text-lg font-bold">What you&apos;ve proven, not just watched</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-bg p-4">
                <span className="text-xs font-semibold text-ink-2">Activity</span>
                <span className="text-2xl font-bold">
                  {formatMinutes(r.evidence.activityMinutes)}
                </span>
                <span className="text-[13px] text-muted">focused study time</span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-knowledge-soft p-4">
                <span className="text-xs font-semibold text-knowledge">Knowledge</span>
                <span className="text-2xl font-bold">
                  {r.evidence.knowledge.correct} / {r.evidence.knowledge.total}
                </span>
                <span className="text-[13px] text-ink-2">questions correct</span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-[14px] bg-primary-soft p-4">
                <span className="text-xs font-semibold text-primary-ink">Practical</span>
                <span className="text-2xl font-bold">
                  {r.evidence.practical.solvedAlone} / {r.evidence.practical.total}
                </span>
                <span className="text-[13px] text-ink-2">exercises solved alone</span>
              </div>
            </div>
          </section>

          <details className="rounded-3xl border border-line bg-surface p-6">
            <summary className="cursor-pointer text-lg font-bold">Review your answers</summary>
            <ol className="mt-4 flex flex-col gap-4 pl-5">
              {r.review.map((q) => {
                const right = q.chosen === q.correctIndex;
                return (
                  <li key={q.id} className="flex flex-col gap-1 text-sm leading-normal">
                    <span className="font-semibold">{q.prompt.replace(/^Q\d+\.\s*/, "")}</span>
                    <span className={right ? "text-primary-ink" : "text-warning-ink"}>
                      {right ? "✓ " : "✗ "}Your answer:{" "}
                      {q.chosen !== null ? q.options[q.chosen] : "—"}
                    </span>
                    {!right && (
                      <span className="text-ink-2">Correct: {q.options[q.correctIndex]}</span>
                    )}
                    <span className="text-muted">{q.rationale}</span>
                  </li>
                );
              })}
            </ol>
          </details>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          {rec && (
            <section
              aria-label="Your next step"
              className="flex flex-col gap-3.5 rounded-3xl bg-panel p-6 text-white"
            >
              <span className="eyebrow text-panel-muted">Your next step</span>
              <h2 className="m-0 text-[22px] leading-[1.3] font-bold">{rec.title}</h2>
              <p className="m-0 text-sm leading-relaxed text-panel-text">
                {rec.detail}. {rec.reason}
              </p>
              {action.error && <Alert>{action.error.message}</Alert>}
              <Button
                variant="white"
                className="h-12 rounded-lg text-[15px] font-bold"
                onClick={() => action.mutate()}
                disabled={action.isPending}
              >
                {rec.kind === "revise"
                  ? "Start recall"
                  : rec.kind === "practice"
                    ? "Start practice"
                    : rec.kind === "learn"
                      ? "Make it today's focus"
                      : "Open roadmap"}
              </Button>
              <Link href="/roadmap" className="self-center text-sm font-semibold text-white">
                See the roadmap instead
              </Link>
            </section>
          )}

          <section
            aria-label="Revision plan"
            className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6"
          >
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-lg font-bold">Revision scheduled</h2>
              <span className="text-[13px] text-muted">Weak concepts come back sooner</span>
            </div>
            {r.revisions.length === 0 ? (
              <p className="m-0 text-sm text-muted">Nothing scheduled yet.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {r.revisions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-start gap-3.5 border-b border-line-soft py-2.5 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "mt-1 h-3 w-3 flex-none rounded-full",
                        v.weak ? "bg-warning" : "bg-primary",
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">{v.title}</span>
                      <span className="text-[13px] text-muted">
                        {dueLabel(v.dueAt)} · {v.minutes} min
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
