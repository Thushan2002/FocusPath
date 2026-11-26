import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getProfile } from "@/lib/dal/profile";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set your goal" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-[clamp(16px,4vw,48px)] py-5">
        <Logo />
        <span className="text-sm text-muted">Step 1 of 2 · Your learning profile</span>
      </header>
      <main className="flex flex-1 justify-center px-[clamp(16px,4vw,48px)] py-[clamp(24px,5vw,64px)]">
        <div className="flex w-full max-w-[1120px] flex-wrap items-start gap-8">
          <aside className="flex max-w-[380px] flex-[1_1_300px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="m-0 text-4xl leading-[1.15] font-bold tracking-[-0.02em]">One goal. One path. One step at a time.</h1>
              <p className="m-0 text-base leading-relaxed text-muted">
                Tell us where you want to go and how much time you really have. We&apos;ll build a realistic roadmap and tell you exactly what to do today.
              </p>
            </div>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {["Goal & current level", "Time & learning style", "Your roadmap"].map((label, i) => (
                <li key={label} className={`flex items-center gap-3 rounded-lg px-3.5 py-3 ${i === 0 ? "bg-primary-soft" : ""}`}>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
                      i === 0 ? "bg-primary text-white" : "border-[1.5px] border-field text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-[15px] ${i === 0 ? "font-semibold" : "text-muted"}`}>{label}</span>
                </li>
              ))}
            </ol>
            <div className="rounded-lg border border-line bg-surface p-4 text-sm leading-[1.55] text-muted">
              <strong className="text-ink">You stay in control.</strong> You can change your goal, pace or plan any time.
            </div>
          </aside>
          <OnboardingForm
            initial={
              profile && {
                level: profile.level,
                priorKnowledge: profile.priorKnowledge,
                dailyMinutes: profile.dailyMinutes,
                targetMonths: profile.targetMonths,
                struggle: profile.struggle,
              }
            }
          />
        </div>
      </main>
    </div>
  );
}
