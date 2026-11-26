"use client";

import { MAX_HINT_LEVEL } from "@focuspath/shared";
import { Alert } from "@/components/ui/field";
import type { ExerciseView } from "@/lib/api";
import { useRequestHint } from "../hooks/use-exercises";

function hintButtonLabel(used: number): string {
  if (used + 1 === MAX_HINT_LEVEL) return "Reveal answer hint";
  return used ? "Show next hint" : "Show a hint";
}

/**
 * Progressive hints for the current exercise, one level at a time. `getContext` is read at click
 * time so the hint sees the learner's latest code and failing test.
 */
export function HintBox({
  conceptId,
  exercise,
  getContext,
}: {
  conceptId: string;
  exercise: ExerciseView;
  getContext: () => { code: string; error: string | null };
}) {
  const hint = useRequestHint(conceptId, exercise.id);
  const hints = exercise.hints;
  const nextLevel = hints.length + 1;

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-field p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink-2">
          Hints for {exercise.title.replace(/ — .*/, "")}
        </span>
        <span className="text-xs text-muted">
          {hints.length} of {MAX_HINT_LEVEL} used
        </span>
      </div>
      {hints.map((h) => (
        <div
          key={h.level}
          className="rounded-md bg-warning-soft px-3 py-2.5 text-sm leading-normal text-warning-deep"
        >
          {h.text}
        </div>
      ))}
      {hint.error && <Alert>{hint.error.message}</Alert>}
      {nextLevel <= MAX_HINT_LEVEL && (
        <button
          type="button"
          onClick={() => {
            const { code, error } = getContext();
            hint.mutate({ code, lastError: error });
          }}
          disabled={hint.isPending}
          className="h-10 rounded-md border-[1.5px] border-warning bg-surface text-[13px] font-semibold text-warning-ink hover:bg-warning-soft disabled:opacity-60"
        >
          {hint.isPending ? "Thinking…" : hintButtonLabel(hints.length)}
        </button>
      )}
      {nextLevel === MAX_HINT_LEVEL && (
        <span className="text-xs text-muted">
          The answer hint means this exercise won&apos;t count as solved on your own.
        </span>
      )}
    </div>
  );
}
