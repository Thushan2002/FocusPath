"use client";

import { useCountdown } from "./use-countdown";
import { useStudySession } from "./use-study-session";

const SESSION_SECONDS = 25 * 60;

/**
 * Focus timer (25-minute countdown). Time is recorded as a study session only while the timer runs —
 * that's activity evidence, kept separate from knowledge and practical evidence.
 */
export function useStudyTimer(conceptId: string) {
  const session = useStudySession(conceptId);
  const countdown = useCountdown(SESSION_SECONDS, session.addSecond);

  async function toggle() {
    if (countdown.running) {
      countdown.pause();
      await session.sync();
      return;
    }
    await session.ensureStarted();
    countdown.start();
  }

  return { clock: countdown.clock, running: countdown.running, toggle };
}
