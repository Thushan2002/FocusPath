"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A pausable countdown clock. Pure UI state: knows nothing about study sessions or the server.
 * `onTick` fires once per running second (used to accumulate active time).
 */
export function useCountdown(totalSeconds: number, onTick?: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      tick.current?.();
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    if (remaining === 0) setRemaining(totalSeconds);
    setRunning(true);
  };
  const pause = () => setRunning(false);

  return { remaining, running, start, pause, clock: formatClock(remaining) };
}

export function formatClock(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
