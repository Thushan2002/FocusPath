"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEVEL_OPTIONS, formatMinutes } from "@focuspath/shared";
import { Check } from "@/components/icons";
import { StatusBadge, StatusDot } from "@/components/status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/field";
import { endpoints, queryKeys, type ConceptDetail, type RoadmapView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { paths } from "@/lib/routes";

export function RoadmapScreen({ initial }: { initial: RoadmapView }) {
  const router = useRouter();
  const { data: view } = useQuery({
    queryKey: queryKeys.roadmap,
    queryFn: endpoints.roadmap.get,
    initialData: initial,
    refetchOnMount: "always",
  });
  const all = view.modules.flatMap((m) => m.concepts);
  const defaultSel =
    view.focusConceptId ??
    all.find((c) => c.status === "in_progress")?.id ??
    all.find((c) => c.status === "up_next")?.id ??
    all[0]?.id;
  const [selected, setSelected] = useState<string | undefined>(defaultSel);
  const currentModuleId = view.currentModule?.id;
  const [open, setOpen] = useState<Set<string>>(new Set(currentModuleId ? [currentModuleId] : []));

  const detail = useQuery({
    queryKey: queryKeys.concepts.one(selected),
    queryFn: () => endpoints.concepts.get(selected!),
    enabled: Boolean(selected),
  });

  const focus = useMutation({
    mutationFn: endpoints.focus.set,
    onSuccess: () => {
      router.push(paths.today);
      router.refresh();
    },
  });
  const regenerate = useMutation({
    mutationFn: () => endpoints.roadmap.regenerate(view.goal.id),
    onSuccess: ({ roadmapId }) => router.push(paths.roadmapGenerating(roadmapId)),
  });

  const level = LEVEL_OPTIONS.find((l) => l.value === view.profile?.level)?.label;
  const cm = view.currentModule;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-primary-ink">Your roadmap</span>
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em]">{view.goal.title}</h1>
          <p className="m-0 text-[15px] text-muted">
            {[
              level,
              view.profile && `${formatMinutes(view.profile.dailyMinutes)} a day`,
              view.profile && `${view.profile.targetMonths} months`,
              `${view.totals.modules} modules`,
              `${view.totals.concepts} concepts`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-md">
              Edit plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="m-0 text-[22px] font-bold">Change your plan</DialogTitle>
            <DialogDescription className="m-0 text-[15px] leading-relaxed text-ink-2">
              Regenerating creates a new version of this roadmap. Concepts that carry over keep your
              mastery and revision schedule.
            </DialogDescription>
            {regenerate.error && <Alert>{regenerate.error.message}</Alert>}
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
                Regenerate this roadmap
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/onboarding">Change my goal</Link>
              </Button>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {cm && (
        <Card as="div" className="gap-3 rounded-2xl px-6 py-5">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-semibold">
              Module {cm.position + 1} of {view.totals.modules} · {cm.title}
            </span>
            <span className="text-muted">
              {cm.mastered} of {cm.total} concepts mastered · {view.totals.mastered} of{" "}
              {view.totals.concepts} overall
            </span>
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${view.totals.modules}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {view.modules.map((m) => {
              const pct = m.concepts.length
                ? (m.concepts.filter((c) => c.status === "mastered").length / m.concepts.length) *
                  100
                : 0;
              const isCurrent = m.id === cm.id;
              return (
                <div
                  key={m.id}
                  className="h-2 rounded"
                  style={{
                    background:
                      pct === 100
                        ? "#0D6E5F"
                        : isCurrent
                          ? `linear-gradient(90deg, #0D6E5F ${pct}%, #A9D3CB ${pct}%)`
                          : "#E3E6EB",
                  }}
                />
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Modules" className="flex min-w-0 flex-[999_1_480px] flex-col gap-3">
          {view.modules.map((m) => {
            const isOpen = open.has(m.id);
            const isCurrent = m.id === currentModuleId;
            const mastered = m.concepts.filter((c) => c.status === "mastered").length;
            return (
              <div
                key={m.id}
                className={cn(
                  "overflow-hidden rounded-2xl bg-surface",
                  isCurrent ? "border-[1.5px] border-primary" : "border border-line",
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpen(
                      (s) => new Set(s.has(m.id) ? [...s].filter((x) => x !== m.id) : [...s, m.id]),
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-3.5 px-5 text-left",
                    isOpen ? "border-b border-line py-[18px]" : "py-4",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 flex-none items-center justify-center rounded-md font-bold",
                      isCurrent
                        ? "bg-primary text-white"
                        : mastered === m.concepts.length
                          ? "bg-primary-soft text-primary-ink"
                          : "bg-chip text-muted",
                    )}
                  >
                    {m.position + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-base",
                        isCurrent ? "text-[17px] font-bold" : "font-semibold",
                      )}
                    >
                      {m.title}
                    </span>
                    <span className="text-[13px] text-muted">
                      {isOpen || isCurrent
                        ? `${mastered === m.concepts.length ? "Complete" : isCurrent ? "In progress" : `${mastered}/${m.concepts.length} mastered`} · Milestone: ${m.milestone}`
                        : m.concepts.map((c) => c.title).join(" · ")}
                    </span>
                  </span>
                  <span className="text-[13px] whitespace-nowrap text-muted">
                    ~{m.estWeeks} week{m.estWeeks > 1 ? "s" : ""}
                  </span>
                </button>
                {isOpen && (
                  <ul className="m-0 list-none p-2">
                    {m.concepts.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          aria-pressed={c.id === selected}
                          onClick={() => setSelected(c.id)}
                          className={cn(
                            "flex min-h-[52px] w-full items-center gap-3.5 rounded-md px-3",
                            c.id === selected ? "bg-primary-tint" : "hover:bg-bg",
                          )}
                        >
                          <StatusDot status={c.status} />
                          <span className="flex-1 text-left text-[15px] font-medium text-ink">
                            {c.title}
                          </span>
                          <StatusBadge status={c.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        <aside
          aria-label="Topic detail"
          className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-2xl border border-line bg-surface p-6"
        >
          {!detail.data ? (
            <p className="m-0 text-sm text-muted">
              {detail.isError ? "Couldn't load this concept." : "Loading concept…"}
            </p>
          ) : (
            <ConceptPanel
              d={detail.data}
              onFocus={() => focus.mutate(detail.data.id)}
              pending={focus.isPending}
              error={focus.error?.message}
              isFocus={view.focusConceptId === detail.data.id}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function ConceptPanel({
  d,
  onFocus,
  pending,
  error,
  isFocus,
}: {
  d: ConceptDetail;
  onFocus: () => void;
  pending: boolean;
  error?: string;
  isFocus: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">
          {d.module.title} · Concept {d.indexInModule} of {d.moduleConceptCount}
        </span>
        <h2 className="m-0 text-2xl font-bold tracking-[-0.01em]">{d.title}</h2>
        <StatusBadge status={d.status} />
      </div>
      <p className="m-0 text-sm leading-normal text-ink-2">{d.summary}</p>
      <div className="flex flex-col gap-2.5">
        <h3 className="m-0 text-sm font-semibold text-ink-2">What you&apos;ll cover</h3>
        <ol className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-[1.45] text-ink-2">
          {d.subtopics.map((s) => (
            <li key={s.id}>{s.title}</li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-bg p-3.5">
        <span className="text-[13px] font-semibold text-ink-2">Needs first</span>
        <span className="text-sm text-ink">
          {d.prerequisites.length
            ? d.prerequisites.map((p) => `${p.title}${p.mastered ? " ✓" : ""}`).join(", ")
            : "None — start here"}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <h3 className="m-0 text-sm font-semibold text-ink-2">Done means</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-ink-2">
          {[
            `Score ${d.criteria.quizPassPct}%+ on the concept quiz`,
            `Solve ${d.criteria.exercisesRequired} coding exercises without the answer hint`,
            ...(d.criteria.explanationRequired ? ["Explain it in your own words"] : []),
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="flex-none text-primary" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2.5 text-[13px] text-muted">
        <span>≈ {formatMinutes(d.estMinutes)}</span>
        <span aria-hidden="true">·</span>
        <span>{d.criteria.exercisesRequired} exercises</span>
        {d.mastery !== null && (
          <>
            <span aria-hidden="true">·</span>
            <span>Estimate {Math.round(d.mastery)}%</span>
          </>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
      {d.status === "locked" && (
        <p className="m-0 text-[13px] text-warning-ink">
          Its prerequisites aren&apos;t started yet — you can still choose it on purpose.
        </p>
      )}
      <Button
        size="lg"
        className="h-[50px] text-[15px]"
        onClick={onFocus}
        disabled={pending || isFocus}
      >
        {isFocus ? "Today's focus" : pending ? "Setting focus…" : "Set as today's focus"}
      </Button>
    </>
  );
}
