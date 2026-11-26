import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Check } from "@/components/icons";
import { googleEnabled } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getSessionUser()) redirect("/");
  return (
    <AuthShell
      panel={
        <>
          <h1 className="m-0 text-[clamp(30px,3.4vw,44px)] leading-[1.12] font-bold tracking-[-0.02em]">
            Stop jumping between tutorials. Start building real skills.
          </h1>
          <p className="m-0 text-base leading-relaxed text-panel-text">
            One goal, a realistic daily plan, and an AI tutor that knows where you are — one focused milestone at a time.
          </p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px] text-[#E6F2EF]">
            {["A personal roadmap for your goal", "Daily tasks that fit your time", "Know what you've mastered — and what to revise"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <Check className="text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </>
      }
    >
      <SignUpForm google={googleEnabled()} />
    </AuthShell>
  );
}
