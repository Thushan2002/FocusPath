import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { googleEnabled } from "@/lib/env";
import { safeNext } from "@/lib/password";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  if (await getSessionUser()) redirect(safeNext(sp.next));
  return (
    <AuthShell
      panel={
        <>
          <h1 className="m-0 text-[clamp(30px,3.4vw,44px)] leading-[1.12] font-bold tracking-[-0.02em]">
            Welcome back. Your path is right where you left it.
          </h1>
          <p className="m-0 text-base leading-relaxed text-panel-text">
            Today's focus, your tasks and any revision that's due are waiting for you.
          </p>
        </>
      }
    >
      <LoginForm google={googleEnabled()} next={safeNext(sp.next)} resetDone={sp.reset === "1"} />
    </AuthShell>
  );
}
