"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TestResult } from "@focuspath/shared";
import { endpoints, queryKeys, type ExerciseView } from "@/lib/api";

/** The concept's exercises (generated on first request, so cached for the whole visit). */
export function useExercises(conceptId: string) {
  return useQuery({
    queryKey: queryKeys.exercises(conceptId),
    queryFn: () => endpoints.concepts.exercises(conceptId),
    staleTime: Infinity,
  });
}

export function useSubmitExercise(conceptId: string, exerciseId: string, onSolved: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, results }: { code: string; results: TestResult[] }) =>
      endpoints.exercises.submit(exerciseId, code, results),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: queryKeys.exercises(conceptId) });
      void qc.invalidateQueries({ queryKey: queryKeys.today });
      if (r.solved) onSolved();
    },
  });
}

/** Next progressive hint; writes the updated hint list straight into the exercises cache. */
export function useRequestHint(conceptId: string, exerciseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, lastError }: { code: string; lastError: string | null }) =>
      endpoints.exercises.hint(exerciseId!, code, lastError),
    onSuccess: ({ hints }) =>
      qc.setQueryData<ExerciseView[]>(queryKeys.exercises(conceptId), (old) =>
        old?.map((e) => (e.id === exerciseId ? { ...e, hints } : e)),
      ),
  });
}
