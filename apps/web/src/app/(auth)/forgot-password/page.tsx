"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "rate">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" });
    // Same message whether or not the account exists, so emails can't be enumerated.
    setState(error?.status === 429 ? "rate" : "sent");
  }

  return (
    <AuthShell
      panel={
        <h1 className="m-0 text-[clamp(30px,3.4vw,44px)] leading-[1.12] font-bold tracking-[-0.02em]">
          Locked out? It happens. Let&apos;s get you back to your path.
        </h1>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Reset your password</h2>
          <p className="m-0 text-[15px] text-muted">We&apos;ll email you a link that&apos;s valid for one hour.</p>
        </div>
        {state === "sent" && <Alert tone="info">If an account exists for {email}, a reset link is on its way. Check your inbox.</Alert>}
        {state === "rate" && <Alert>Too many requests — wait a few minutes and try again.</Alert>}
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" disabled={state === "busy" || !email.includes("@")} className="font-bold">
          {state === "busy" ? "Sending…" : "Send reset link"}
        </Button>
        <p className="m-0 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
