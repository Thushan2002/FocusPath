"use client";

import { useEffect, useRef, useState } from "react";
import type { ExerciseTest, TestResult } from "@focuspath/shared";
import { PythonRunner, type CodeRunner } from "@/lib/pyodide/runner";

export interface RunState {
  results: TestResult[] | null;
  stdout: string;
  runtimeError: string | null;
  /** The exact code the current results belong to (to detect stale results). */
  ranCode: string | null;
  running: boolean;
}

const INITIAL: RunState = {
  results: null,
  stdout: "",
  runtimeError: null,
  ranCode: null,
  running: false,
};

const defaultRunner = (): CodeRunner => new PythonRunner();

/**
 * Owns a `CodeRunner` for the component's lifetime and exposes `run(code)`.
 * The runner is injected via `createRunner` (defaults to in-browser Python).
 */
export function useCodeRunner(
  tests: ExerciseTest[],
  createRunner: () => CodeRunner = defaultRunner,
) {
  const runner = useRef<CodeRunner | null>(null);
  const factory = useRef(createRunner);
  const [state, setState] = useState<RunState>(INITIAL);

  useEffect(() => {
    const r = factory.current();
    runner.current = r;
    r.warmUp().catch(() => {});
    return () => r.dispose();
  }, []);

  async function run(code: string) {
    if (!runner.current) return;
    setState((s) => ({ ...s, running: true, runtimeError: null }));
    try {
      const out = await runner.current.run(code, tests);
      setState({
        results: out.results,
        stdout: out.stdout,
        ranCode: code,
        runtimeError: out.error && !out.results.length ? out.error : null,
        running: false,
      });
    } catch (e) {
      setState((s) => ({ ...s, runtimeError: (e as Error).message, running: false }));
    }
  }

  return { ...state, run };
}
