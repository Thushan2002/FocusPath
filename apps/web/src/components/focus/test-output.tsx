import type { TestResult } from "@focuspath/shared";

const MAX_STDOUT_CHARS = 2000;

/** Console-style output under the editor: test results, runtime errors and captured stdout. */
export function TestOutput({
  results,
  runtimeError,
  stdout,
  testCount,
}: {
  results: TestResult[] | null;
  runtimeError: string | null;
  stdout: string;
  testCount: number;
}) {
  return (
    <div
      className="flex flex-col gap-1 border-t border-code-line px-4 py-3 font-mono text-[13px]"
      aria-live="polite"
    >
      {results === null && !runtimeError && (
        <span className="text-code-muted">
          Run the tests to check your code. {testCount} test{testCount > 1 ? "s" : ""}.
        </span>
      )}
      {runtimeError && <span className="text-code-error">{runtimeError}</span>}
      {results?.map((r) => (
        <span key={r.name} className={r.passed ? "text-[#9FD8CB]" : "text-code-error"}>
          {r.passed ? "✓" : "✗"} {r.name}
          {!r.passed && r.message ? ` — ${r.message}` : ""}
        </span>
      ))}
      {stdout.trim() && (
        <pre className="m-0 mt-1 whitespace-pre-wrap text-code-muted">
          {stdout.trim().slice(0, MAX_STDOUT_CHARS)}
        </pre>
      )}
    </div>
  );
}
