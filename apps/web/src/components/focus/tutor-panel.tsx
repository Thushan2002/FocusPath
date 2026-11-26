"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { TutorMode } from "@focuspath/shared";
import { ArrowRight, Sparkle } from "@/components/icons";
import { Alert } from "@/components/ui/field";
import type { ExerciseView } from "@/lib/api";
import { useTutorChat } from "./hooks/use-tutor-chat";
import { ChatMessage } from "./tutor/chat-message";
import { HintBox } from "./tutor/hint-box";

/** Imperative API used by Focus mode: prefill a question, or share the learner's current code. */
export interface TutorPanelHandle {
  ask: (text: string) => void;
  setContext: (code: string, lastError: string | null) => void;
}

const QUICK_PROMPTS: { mode: TutorMode; label: string; text: string }[] = [
  { mode: "simpler", label: "Simpler explanation", text: "Can you explain this more simply?" },
  { mode: "example", label: "Real-world example", text: "Show me a real-world example." },
  { mode: "quiz", label: "Quiz me", text: "Quiz me on this." },
];

export const TutorPanel = forwardRef<
  TutorPanelHandle,
  { conceptId: string; exercise: ExerciseView | null }
>(function TutorPanel({ conceptId, exercise }, ref) {
  const { messages, send } = useTutorChat(conceptId, exercise?.id ?? null);
  const [input, setInput] = useState("");
  const codeContext = useRef<{ code: string; error: string | null }>({ code: "", error: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    ask: (text) => {
      setInput(text);
      inputRef.current?.focus();
    },
    setContext: (code, error) => {
      codeContext.current = { code, error };
    },
  }));

  // Block body on purpose: newer browsers return a Promise from scroll methods, which React
  // would mistake for an effect cleanup.
  useEffect(() => {
    void endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages?.length]);

  const ask = (message: string, mode: TutorMode = "free") => send.mutate({ message, mode });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput("");
    ask(message);
  }

  return (
    <aside
      aria-label="AI tutor"
      className="flex min-w-0 flex-[1_1_360px] flex-col overflow-hidden rounded-3xl border border-line bg-surface"
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary-ink">
          <Sparkle size={20} />
        </span>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold">AI tutor</span>
          <span className="text-xs text-muted">Knows your roadmap, level &amp; weak spots</span>
        </div>
      </div>

      <div className="flex max-h-[560px] flex-col gap-4 overflow-y-auto p-5" aria-live="polite">
        {messages?.length === 0 && !send.isPending && (
          <p className="m-0 text-sm leading-normal text-muted">
            Ask anything about this concept. When you&apos;re stuck on an exercise, use the hints
            below — they get more specific one step at a time.
          </p>
        )}
        {messages?.map((m) => (
          <ChatMessage key={m.id} message={m} onFollowup={ask} />
        ))}
        {send.isPending && <span className="text-sm text-muted">Tutor is thinking…</span>}
        {send.error && <Alert>{send.error.message}</Alert>}

        {exercise && (
          <HintBox
            conceptId={conceptId}
            exercise={exercise}
            getContext={() => codeContext.current}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((c) => (
            <button
              key={c.mode}
              type="button"
              disabled={send.isPending}
              onClick={() => ask(c.text, c.mode)}
              className="h-9 rounded-full border border-field bg-surface px-3 text-[13px] text-ink-2 hover:bg-bg"
            >
              {c.label}
            </button>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-auto flex gap-2 border-t border-line px-4 py-3.5">
        <label htmlFor="ask" className="sr-only">
          Ask the tutor
        </label>
        <input
          ref={inputRef}
          id="ask"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Ask about this concept…"
          className="h-11 min-w-0 flex-1 rounded-md border-[1.5px] border-field px-3.5 text-sm"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={send.isPending}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white disabled:opacity-60"
        >
          <ArrowRight />
        </button>
      </form>
    </aside>
  );
});
