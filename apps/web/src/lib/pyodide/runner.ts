"use client";

import type { ExerciseTest, TestResult } from "@focuspath/shared";

export interface RunOutput {
  results: TestResult[];
  stdout: string;
  error: string | null;
}

const RUN_TIMEOUT_MS = 8000;

/**
 * Executes learner code against an exercise's tests. The UI depends on this abstraction, not on
 * Pyodide, so another runtime (or a test double) can be substituted without touching components.
 */
export interface CodeRunner {
  /** Start loading the runtime in the background. */
  warmUp(): Promise<void>;
  run(code: string, tests: ExerciseTest[]): Promise<RunOutput>;
  dispose(): void;
}

/**
 * Owns one Pyodide worker. A run that exceeds the timeout (e.g. an infinite loop) terminates the
 * worker; the next run starts a fresh one.
 */
export class PythonRunner implements CodeRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private seq = 0;

  private start() {
    this.worker = new Worker("/pyodide-worker.js", { type: "module" });
    const w = this.worker;
    this.ready = new Promise((resolve, reject) => {
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "ready") resolve();
        if (e.data?.type === "load-error")
          reject(
            new Error("Couldn't load the Python runtime. Check your connection and try again."),
          );
        if (e.data?.type === "ready" || e.data?.type === "load-error")
          w.removeEventListener("message", onMsg);
      };
      w.addEventListener("message", onMsg);
    });
  }

  /** Start downloading Python in the background. */
  warmUp() {
    if (!this.worker) this.start();
    return this.ready!;
  }

  async run(code: string, tests: ExerciseTest[]): Promise<RunOutput> {
    await this.warmUp();
    const w = this.worker!;
    const id = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        w.removeEventListener("message", onMsg);
        this.dispose();
        resolve({
          results: tests.map((t) => ({
            name: t.name,
            passed: false,
            message: "Timed out — is there an infinite loop?",
          })),
          stdout: "",
          error: "Your code took longer than 8 seconds and was stopped.",
        });
      }, RUN_TIMEOUT_MS);
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type !== "result" || e.data.id !== id) return;
        clearTimeout(timer);
        w.removeEventListener("message", onMsg);
        const results: TestResult[] =
          e.data.results ??
          tests.map((t) => ({
            name: t.name,
            passed: false,
            message: e.data.error ?? "Run failed",
          }));
        resolve({ results, stdout: e.data.stdout ?? "", error: e.data.error ?? null });
      };
      w.addEventListener("message", onMsg);
      w.postMessage({ id, code, tests });
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}
