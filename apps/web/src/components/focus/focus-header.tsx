"use client";

import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { paths } from "@/lib/routes";

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {playing ? (
        <>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </>
      ) : (
        <path d="M7 4l13 8-13 8z" />
      )}
    </svg>
  );
}

/** Focus-mode top bar: exit, current concept/exercise, study timer and "Switch topic". */
export function FocusHeader({
  title,
  timer,
  onSwitchTopic,
}: {
  title: string;
  timer: { clock: string; running: boolean; toggle: () => Promise<void> };
  onSwitchTopic: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-[clamp(16px,3vw,32px)] py-3.5">
      <div className="flex flex-wrap items-center gap-3.5">
        <Link
          href={paths.today}
          aria-label="Exit focus mode"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink-2"
        >
          <ArrowLeft />
        </Link>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-[0.06em] text-primary-ink uppercase">
            Focus mode
          </span>
          <span className="text-base font-bold">{title}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex h-11 items-center gap-2.5 rounded-lg bg-panel py-0 pr-1.5 pl-4 text-white">
          <span className="font-mono text-lg font-medium tracking-[0.02em]" aria-live="off">
            {timer.clock}
          </span>
          <button
            type="button"
            onClick={() => void timer.toggle()}
            aria-label={timer.running ? "Pause timer" : "Start timer"}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-sm bg-panel-3 text-white"
          >
            <PlayPauseIcon playing={timer.running} />
          </button>
        </div>
        <Button variant="outline" className="rounded-lg text-ink-2" onClick={onSwitchTopic}>
          Switch topic
        </Button>
      </div>
    </header>
  );
}
