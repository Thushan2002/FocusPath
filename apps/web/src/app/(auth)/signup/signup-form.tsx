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
import { passwordStrength } from "@/lib/password";

export function SignUpForm({ google }: { google: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(pw);
  const ok = agree && pw.length >= 8 && name.trim().length > 0 && email.includes("@");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password: pw });
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts — wait a minute and try again." : (error.message ?? "Could not create your account."));
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[28px] font-bold tracking-[-0.01em]">Create your account</h2>
        <p className="m-0 text-[15px] text-muted">Free to start. Takes under a minute.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      {google && (
        <>
          <GoogleButton callbackURL="/onboarding" />
          <OrDivider />
        </>
      )}
      <Field>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field>
        <Label htmlFor="pw">Password</Label>
        <PasswordInput id="pw" autoComplete="new-password" placeholder="At least 8 characters" aria-describedby="pwHint" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
        <div className="mt-1 grid grid-cols-4 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 rounded-[2px]" style={{ background: i < strength.score ? strength.color : "#E3E6EB" }} />
          ))}
        </div>
        <span id="pwHint" className="text-[13px] text-muted" aria-live="polite">
          {strength.label}
        </span>
      </Field>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-normal text-ink-2">
        <input type="checkbox" checked={agree} onChange={() => setAgree((a) => !a)} className="mt-px h-5 w-5 flex-none accent-primary" />
        <span>
          I agree to the <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>. My learning data stays private to me.
        </span>
      </label>
      <Button type="submit" size="lg" variant={ok ? "primary" : "muted"} disabled={!ok || busy} className="font-bold">
        {busy ? "Creating account…" : "Create account"}
      </Button>
      <p className="m-0 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold">
          Log in
        </Link>
      </p>
    </form>
  );
}
