"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";
import { endpoints, queryKeys, type AssessmentView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/routes";

export function QuizScreen({ quiz }: { quiz: AssessmentView }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const submit = useMutation({
    mutationFn: () => endpoints.assessments.submit(quiz.id, answers),
    onSuccess: ({ attemptId }) => {
      // A graded quiz changes mastery, so every view derived from it is stale.
      for (const queryKey of [queryKeys.today, queryKeys.roadmap, queryKeys.concepts.all])
        void qc.invalidateQueries({ queryKey });
      router.push(paths.results(attemptId));
    },
  });
  const answered = Object.keys(answers).length;
  const total = quiz.questions.length;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-primary-ink">
          {quiz.kind === "recall" ? "Recall check" : "Concept quiz"}
        </span>
        <h1 className="m-0 text-[30px] font-bold tracking-[-0.02em]">{quiz.concept.title}</h1>
        <p className="m-0 text-[15px] text-muted">
          {total} questions · one answer each. This checks understanding — it&apos;s an estimate,
          not a grade.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="flex max-w-[820px] flex-col gap-4"
      >
        {quiz.questions.map((q, qi) => (
          <fieldset
            key={q.id}
            className="m-0 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-6"
          >
            <legend className="sr-only">Question {qi + 1}</legend>
            <p className="m-0 text-[15px] leading-relaxed font-semibold whitespace-pre-line">
              <span className="mr-2 text-muted">{qi + 1}.</span>
              {q.prompt.replace(/^Q\d+\.\s*/, "")}
            </p>
            <div className="flex flex-col gap-2">
              {q.options.map((opt, oi) => {
                const on = answers[q.id] === oi;
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-[1.5px] px-3.5 py-2.5 text-[15px]",
                      on ? "border-primary bg-primary-soft" : "border-field hover:bg-bg",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={on}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className="h-[18px] w-[18px] flex-none accent-primary"
                    />
                    <span className="whitespace-pre-line">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        {submit.error && <Alert>{submit.error.message}</Alert>}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 px-5 py-4 backdrop-blur">
          <span className="text-sm text-muted" aria-live="polite">
            {answered} of {total} answered
          </span>
          <Button type="submit" size="lg" disabled={answered < total || submit.isPending}>
            {submit.isPending ? "Scoring…" : "Submit answers"}
          </Button>
        </div>
      </form>
    </>
  );
}
