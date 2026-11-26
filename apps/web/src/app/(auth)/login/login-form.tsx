"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OrDivider } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ google, next, resetDone }: { google: boolean; next: string; resetDone: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<"credentials" | "rate" | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email: email.trim(), password: pw, rememberMe: remember });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "rate" : "credentials");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Log in</h2>
        <p className="m-0 text-[15px] text-muted">Continue your learning journey.</p>
      </div>
      {resetDone && !error && <Alert tone="info">Your password was changed. Log in with the new one.</Alert>}
      {error === "credentials" && (
        <Alert>
          That email and password don&apos;t match. Try again or{" "}
          <Link href="/forgot-password" className="font-semibold text-warning-deep">
            reset your password
          </Link>
          .
        </Alert>
      )}
      {error === "rate" && <Alert>Too many attempts — wait a minute and try again.</Alert>}
      {google && (
        <>
          <GoogleButton callbackURL={next} />
          <OrDivider />
        </>
      )}
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error === "credentials"} required />
      </Field>
      <Field>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="pw">Password</Label>
          <Link href="/forgot-password" className="text-[13px] font-semibold">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="pw" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={error === "credentials"} required />
      </Field>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
        <input type="checkbox" checked={remember} onChange={() => setRemember((r) => !r)} className="m-0 h-5 w-5 accent-primary" />
        Keep me logged in on this device
      </label>
      <Button type="submit" size="lg" disabled={busy} className="font-bold">
        {busy ? "Logging in…" : "Log in"}
      </Button>
      <p className="m-0 text-center text-sm text-muted">
        New to FocusPath?{" "}
        <Link href="/signup" className="font-semibold">
          Create an account
        </Link>
      </p>
    </form>
  );
}
