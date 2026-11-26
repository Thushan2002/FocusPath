"use client";

import { useEffect, useState } from "react";

const draftKey = (id: string) => `fp:code:${id}`;

/**
 * Editor contents persisted per exercise in localStorage, so a refresh doesn't lose work.
 * Storage can be unavailable (private mode, blocked site data): drafts then just don't persist.
 */
export function useCodeDraft(exerciseId: string, starterCode: string) {
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(draftKey(exerciseId)) ?? starterCode;
    } catch {
      return starterCode;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(exerciseId), code);
    } catch {
      /* storage unavailable */
    }
  }, [exerciseId, code]);

  return [code, setCode] as const;
}
