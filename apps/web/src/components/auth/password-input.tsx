"use client";

import { useState } from "react";
import { inputClass } from "../ui/field";
import { cn } from "@/lib/cn";

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cn(inputClass, "pr-16", props.className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-[3px] right-1 h-11 px-3 text-[13px] font-semibold text-primary-ink"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
