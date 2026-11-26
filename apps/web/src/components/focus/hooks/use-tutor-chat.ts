"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TutorMode } from "@focuspath/shared";
import { endpoints, queryKeys, type TutorMessageView } from "@/lib/api";

/**
 * Tutor conversation for one concept: history query plus an optimistic `send`.
 * The learner's message appears immediately; on failure the history is refetched.
 */
export function useTutorChat(conceptId: string, exerciseId: string | null) {
  const qc = useQueryClient();
  const key = queryKeys.tutor(conceptId);

  const history = useQuery({ queryKey: key, queryFn: () => endpoints.tutor.history(conceptId) });

  const send = useMutation({
    mutationFn: ({ message, mode }: { message: string; mode: TutorMode }) =>
      endpoints.tutor.send({ conceptId, exerciseId, message, mode }),
    onMutate: ({ message }) => {
      const optimistic: TutorMessageView = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: { blocks: [{ type: "text", text: message }] },
      };
      qc.setQueryData<TutorMessageView[]>(key, (old = []) => [...old, optimistic]);
    },
    onSuccess: (reply) => qc.setQueryData<TutorMessageView[]>(key, (old = []) => [...old, reply]),
    onError: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { messages: history.data, send };
}
