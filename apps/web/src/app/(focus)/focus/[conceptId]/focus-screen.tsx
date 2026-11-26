"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { ExercisePanel } from "@/components/focus/exercise-panel";
import { ExerciseTabs } from "@/components/focus/exercise-tabs";
import { ExplanationBox } from "@/components/focus/explanation-box";
import { FocusHeader } from "@/components/focus/focus-header";
import { useExercises } from "@/components/focus/hooks/use-exercises";
import { useStudyTimer } from "@/components/focus/hooks/use-study-timer";
import { SwitchTopicDialog } from "@/components/focus/switch-dialog";
import { TutorPanel, type TutorPanelHandle } from "@/components/focus/tutor-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/field";
import { endpoints, type ConceptDetail } from "@/lib/api";
import { paths } from "@/lib/routes";

/** Pause before jumping to the next unsolved exercise, so the "Solved" feedback is seen. */
const ADVANCE_DELAY_MS = 1200;

/** Focus mode: one concept — objective, exercises, explanation and the AI tutor side by side. */
export function FocusScreen({ concept }: { concept: ConceptDetail }) {
  const router = useRouter();
  const timer = useStudyTimer(concept.id);
  const tutor = useRef<TutorPanelHandle>(null);
  const [current, setCurrent] = useState(0);
  const [switchOpen, setSwitchOpen] = useState(false);

  const exercises = useExercises(concept.id);
  const quiz = useMutation({
    mutationFn: () => endpoints.concepts.createQuiz(concept.id),
    onSuccess: ({ id }) => router.push(paths.quiz(id)),
  });

  const list = exercises.data ?? [];
  const ex = list[current];

  const advanceToNextUnsolved = () => {
    const next = list.findIndex((e, i) => i > current && !e.solved);
    if (next >= 0) setTimeout(() => setCurrent(next), ADVANCE_DELAY_MS);
  };
  const shareCodeWithTutor = useCallback(
    (code: string, error: string | null) => tutor.current?.setContext(code, error),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <FocusHeader
        title={ex ? `${concept.title} · ${ex.title}` : concept.title}
        timer={timer}
        onSwitchTopic={() => setSwitchOpen(true)}
      />

      <div className="flex flex-1 flex-wrap items-start gap-6 p-[clamp(16px,3vw,32px)]">
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <Card className="gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="m-0 text-[22px] font-bold">Today&apos;s objective</h1>
              <span className="text-[13px] text-muted">
                {concept.module.title} · concept {concept.indexInModule} of{" "}
                {concept.moduleConceptCount}
              </span>
            </div>
            <p className="m-0 text-[15px] leading-relaxed text-ink-2">{concept.summary}</p>
            {list.length > 0 && (
              <ExerciseTabs exercises={list} current={current} onSelect={setCurrent} />
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
              <span className="text-sm text-muted">Ready to prove it?</span>
              <Button
                variant="outline-primary"
                onClick={() => quiz.mutate()}
                disabled={quiz.isPending}
              >
                {quiz.isPending ? "Preparing quiz…" : "Take the concept quiz"}
              </Button>
            </div>
            {quiz.error && <Alert>{quiz.error.message}</Alert>}
          </Card>

          {exercises.isPending && (
            <Card className="text-[15px] text-muted" aria-live="polite">
              Preparing exercises for {concept.title}…
            </Card>
          )}
          {exercises.error && <Alert>{exercises.error.message}</Alert>}
          {ex && (
            <ExercisePanel
              key={ex.id}
              exercise={ex}
              index={current}
              conceptId={concept.id}
              onSolved={advanceToNextUnsolved}
              onCodeChange={shareCodeWithTutor}
            />
          )}

          <ExplanationBox conceptId={concept.id} conceptTitle={concept.title} />
        </main>

        <TutorPanel ref={tutor} conceptId={concept.id} exercise={ex ?? null} />
      </div>

      <SwitchTopicDialog
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        conceptId={concept.id}
        conceptTitle={concept.title}
        onAskTutor={(topic) =>
          tutor.current?.ask(
            `I'm stuck on ${concept.title} and was about to switch to ${topic}. Can you help me get unstuck?`,
          )
        }
        onChangePlan={() => router.push(paths.roadmap)}
      />
    </div>
  );
}
