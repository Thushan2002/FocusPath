"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Alert, Field, Label } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { passwordStrength } from "@/lib/password";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const invalid = params.get("error") === "INVALID_TOKEN" || !token;
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(pw);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: pw, token });
    setBusy(false);
    if (error) {
      setError(error.message ?? "This link is invalid or has expired.");
      return;
    }
    router.push("/login?reset=1");
  }

  if (invalid) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="m-0 text-[28px] font-bold">Link expired</h2>
        <Alert>This reset link is invalid or has expired. Request a new one.</Alert>
        <Button asChild size="lg">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <h2 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Choose a new password</h2>
      {error && <Alert>{error}</Alert>}
      <Field>
        <Label htmlFor="pw">New password</Label>
        <PasswordInput id="pw" autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby="pwHint" />
        <span id="pwHint" className="text-[13px] text-muted">
          {strength.label}
        </span>
      </Field>
      <Button type="submit" size="lg" disabled={busy || pw.length < 8} className="font-bold">
        {busy ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      panel={
        <h1 className="m-0 text-[clamp(30px,3.4vw,44px)] leading-[1.12] font-bold tracking-[-0.02em]">
          Almost there. Pick something you&apos;ll remember.
        </h1>
      }
    >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
