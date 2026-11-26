"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";
import { endpoints, queryKeys } from "@/lib/api";
import { paths } from "@/lib/routes";

const POLL_MS = 1500;

const STEPS = [
  "Reading your goal and time budget",
  "Ordering concepts so prerequisites come first",
  "Writing daily tasks and “done means” criteria",
];

export function GeneratingView({ roadmapId }: { roadmapId: string }) {
  const router = useRouter();
  const status = useQuery({
    queryKey: queryKeys.roadmapStatus(roadmapId),
    queryFn: () => endpoints.roadmap.status(roadmapId),
    refetchInterval: (q) => (q.state.data?.status === "generating" ? POLL_MS : false),
  });
  const retry = useMutation({
    mutationFn: () => endpoints.roadmap.regenerate(status.data!.goalId),
    onSuccess: ({ roadmapId: next }) => router.replace(paths.roadmapGenerating(next)),
  });

  useEffect(() => {
    if (status.data?.status === "ready") {
      router.replace(paths.roadmap);
      router.refresh();
    }
  }, [status.data?.status, router]);

  const failed = status.data?.status === "failed";
  return (
    <section
      aria-live="polite"
      className="mx-auto mt-[8vh] flex w-full max-w-[560px] flex-col gap-6 rounded-3xl border border-line bg-surface p-8"
    >
      <span className="eyebrow text-primary-ink">Your roadmap</span>
      <h1 className="m-0 text-[28px] font-bold tracking-[-0.01em]">
        {failed ? "We couldn't build your roadmap" : "Building your roadmap…"}
      </h1>
      {failed ? (
        <>
          <Alert>
            The AI service didn&apos;t produce a valid plan this time. Your answers are saved — try
            again.
          </Alert>
          <Button size="lg" onClick={() => retry.mutate()} disabled={retry.isPending}>
            Try again
          </Button>
        </>
      ) : (
        <>
          <div className="h-2 overflow-hidden rounded bg-line" aria-hidden="true">
            <div className="h-2 w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded bg-primary" />
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px] text-ink-2">
            {STEPS.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm text-muted">
            This usually takes under a minute. You can leave this page — we&apos;ll keep working.
          </p>
        </>
      )}
    </section>
  );
}
