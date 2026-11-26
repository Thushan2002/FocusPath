import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { assessmentAttempts } from "@focuspath/db";
import { MASTERY } from "@focuspath/shared";
import { StatusBadge } from "@/components/status";
import { db } from "@/lib/db";
import { getRoadmapView } from "@/lib/dal/roadmap";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Progress" };

/** Mastery estimate per concept, with a link to the latest results for each. */
export default async function ProgressPage() {
  const user = await requireUser();
  const view = await getRoadmapView(user.id);
  if (!view) redirect("/roadmap/generating");
  const attempts = await db()
    .select({ id: assessmentAttempts.id, conceptId: assessmentAttempts.conceptId })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.userId, user.id))
    .orderBy(desc(assessmentAttempts.submittedAt));
  const latest = new Map<string, string>();
  for (const a of attempts) if (!latest.has(a.conceptId)) latest.set(a.conceptId, a.id);

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow text-primary-ink">Progress</span>
        <h1 className="m-0 text-[30px] font-bold tracking-[-0.02em]">{view.goal.title}</h1>
        <p className="m-0 text-[15px] text-muted">
          {view.totals.mastered} of {view.totals.concepts} concepts above the {MASTERY.passMark}% line. Estimates, not grades.
        </p>
      </header>
      {view.modules.map((m) => (
        <section key={m.id} className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
          <h2 className="m-0 text-lg font-bold">
            {m.position + 1}. {m.title}
          </h2>
          {m.concepts.map((c) => {
            const href = latest.get(c.id);
            return (
              <div key={c.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {href ? (
                    <Link href={`/results/${href}`} className="text-[15px] font-semibold">
                      {c.title}
                    </Link>
                  ) : (
                    <span className="text-[15px] font-semibold">{c.title}</span>
                  )}
                  <span className="flex items-center gap-2.5">
                    <StatusBadge status={c.status} />
                    <span className="min-w-11 text-right text-[15px] font-bold">{c.mastery === null ? "—" : `${Math.round(c.mastery)}%`}</span>
                  </span>
                </div>
                <div className="relative h-2.5 rounded-[5px] bg-line-soft" aria-hidden="true">
                  <div className="h-2.5 rounded-[5px]" style={{ width: `${c.mastery ?? 0}%`, background: (c.mastery ?? 0) < MASTERY.passMark ? "#C2620E" : "#0D6E5F" }} />
                  <div className="absolute -top-[3px] h-4 w-0.5 bg-muted" style={{ left: `${MASTERY.passMark}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
