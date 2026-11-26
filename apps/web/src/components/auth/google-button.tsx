"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";
import { GoogleIcon } from "../icons";

export function GoogleButton({ callbackURL }: { callbackURL: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      className="h-[50px] rounded-lg text-[15px]"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signIn.social({ provider: "google", callbackURL });
        setBusy(false);
      }}
    >
      <GoogleIcon />
      Continue with Google
    </Button>
  );
}
