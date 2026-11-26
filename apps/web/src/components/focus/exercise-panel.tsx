"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/field";
import type { ExerciseView, SubmissionResult } from "@/lib/api";
import { CodeEditor } from "./code-editor";
import { useCodeDraft } from "./hooks/use-code-draft";
import { useCodeRunner } from "./hooks/use-code-runner";
import { useSubmitExercise } from "./hooks/use-exercises";
import { TestOutput } from "./test-output";

export function exerciseLabel(exercise: Pick<ExerciseView, "isProject">, index: number) {
  return exercise.isProject ? "Mini-project" : `Exercise ${index + 1}`;
}

/** One exercise: prompt, editor, in-browser test run and submission. */
export function ExercisePanel({
  exercise,
  index,
  conceptId,
  onSolved,
  onCodeChange,
}: {
  exercise: ExerciseView;
  index: number;
  conceptId: string;
  onSolved: () => void;
  /** Lets the tutor see the learner's current code and first failing test. */
  onCodeChange: (code: string, lastError: string | null) => void;
}) {
  const [code, setCode] = useCodeDraft(exercise.id, exercise.starterCode);
  const runner = useCodeRunner(exercise.tests);
  const submit = useSubmitExercise(conceptId, exercise.id, onSolved);
  const { results } = runner;

  useEffect(() => {
    onCodeChange(code, results?.find((r) => !r.passed)?.message ?? null);
  }, [code, results, onCodeChange]);

  const allPass = results !== null && results.length > 0 && results.every((r) => r.passed);
  const stale = runner.ranCode !== code;
  const failing = results?.filter((r) => !r.passed) ?? [];

  return (
    <Card aria-label={exercise.title} className="gap-4">
      <h2 className="m-0 text-lg font-bold">
        {exerciseLabel(exercise, index)} — {exercise.title.replace(/^Exercise \d+ — /, "")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-ink-2">
        {exercise.prompt}
      </p>
      <div className="overflow-hidden rounded-xl bg-code-bg">
        <div className="flex items-center justify-between bg-code-bar px-4 py-2.5 text-[13px] text-code-muted">
          <span className="font-mono">solution.py</span>
          <span>Python · runs in your browser</span>
        </div>
        <CodeEditor value={code} onChange={setCode} label={`Code editor for ${exercise.title}`} />
        <TestOutput
          results={results}
          runtimeError={runner.runtimeError}
          stdout={runner.stdout}
          testCount={exercise.tests.length}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button onClick={() => void runner.run(code)} disabled={runner.running} className="px-5">
          {runner.running ? "Running…" : "Run tests"}
        </Button>
        <Button
          variant="outline"
          className="px-5"
          onClick={() => submit.mutate({ code, results: results ?? [] })}
          disabled={!results || stale || submit.isPending}
        >
          {submit.isPending ? "Submitting…" : "Submit solution"}
        </Button>
        {exercise.solved && (
          <span className="text-sm font-semibold text-primary-ink">Solved ✓</span>
        )}
        {results && stale && (
          <span className="text-[13px] text-muted">
            Code changed — run the tests again before submitting.
          </span>
        )}
        {!stale && results && !allPass && (
          <span className="text-[13px] text-muted">
            {failing.length} failing — you can still submit to record the attempt.
          </span>
        )}
      </div>
      {submit.data && <SubmissionFeedback result={submit.data} />}
      {submit.error && <Alert>{submit.error.message}</Alert>}
    </Card>
  );
}

function SubmissionFeedback({ result }: { result: SubmissionResult }) {
  if (!result.solved) {
    return (
      <Alert>
        Recorded: {result.testsPassed} of {result.testsTotal} tests pass. Read the failing test,
        then try a hint if you&apos;re stuck.
      </Alert>
    );
  }
  return (
    <Alert tone="info">
      Solved — all {result.testsTotal} tests pass.
      {result.xpAwarded > 0 ? ` +${result.xpAwarded} XP.` : ""}
      {result.usedAnswerHint
        ? " You used the answer hint, so this one doesn't count toward “solved alone”."
        : ""}
    </Alert>
  );
}
