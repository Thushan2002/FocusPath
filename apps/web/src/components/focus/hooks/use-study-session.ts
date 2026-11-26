"use client";

import { useCallback, useEffect, useRef } from "react";
import { endpoints } from "@/lib/api";

/** Sync accumulated active time to the server at least this often while running. */
const SYNC_EVERY_SECONDS = 30;

/**
 * Records active study time for a concept as a server-side study session (activity evidence).
 * The session is created lazily on first `ensureStarted()`; time is synced periodically and
 * once more when the page is hidden or the component unmounts.
 */
export function useStudySession(conceptId: string) {
  const sessionId = useRef<string | null>(null);
  const active = useRef(0);
  const lastSync = useRef(0);

  const sync = useCallback(async (ended = false) => {
    if (!sessionId.current) return;
    lastSync.current = active.current;
    await endpoints.studySessions.update(sessionId.current, active.current, ended).catch(() => {});
  }, []);

  const ensureStarted = useCallback(async () => {
    if (sessionId.current) return;
    sessionId.current = (await endpoints.studySessions.start(conceptId)).id;
  }, [conceptId]);

  /** Count one second of active study time. */
  const addSecond = useCallback(() => {
    active.current += 1;
    if (active.current - lastSync.current >= SYNC_EVERY_SECONDS) void sync();
  }, [sync]);

  useEffect(() => {
    const onHide = () => void sync(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void sync(true);
    };
  }, [sync]);

  return { ensureStarted, addSecond, sync };
}
