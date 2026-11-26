/* Runs learner Python in the browser (Pyodide), off the main thread.
 * Loaded as a module worker: current Chromium fails cross-origin importScripts from the CDN,
 * while a dynamic import() of pyodide.mjs works.
 * The test harness mirrors services/ai/app/domain/exercise_check.py. */
const PYODIDE_VERSION = "314.0.7";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const HARNESS = `
import json, math
def __fp_run(code, tests_json):
    tests = json.loads(tests_json)
    ns = {"__name__": "__exercise__"}
    out = []
    try:
        exec(code, ns)
    except BaseException as e:
        return json.dumps([{"name": t["name"], "passed": False, "message": f"{type(e).__name__}: {e}"} for t in tests])
    for t in tests:
        try:
            actual = eval(t["call"], ns)
            expected = eval(t["expected"], ns)
            ok = actual == expected or (
                isinstance(actual, (int, float)) and isinstance(expected, (int, float))
                and not isinstance(actual, bool) and math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-9)
            )
            out.append({"name": t["name"], "passed": bool(ok), "message": None if ok else f"AssertionError: {actual!r} != {expected!r}"})
        except BaseException as e:
            out.append({"name": t["name"], "passed": False, "message": f"{type(e).__name__}: {e}"})
    return json.dumps(out)
`;

const ready = (async () => {
  const { loadPyodide } = await import(`${PYODIDE_BASE}pyodide.mjs`);
  const py = await loadPyodide({ indexURL: PYODIDE_BASE });
  await py.runPythonAsync(HARNESS);
  return py;
})();

ready.then(
  () => postMessage({ type: "ready" }),
  (err) => postMessage({ type: "load-error", error: String(err) }),
);

onmessage = async (e) => {
  const { id, code, tests } = e.data;
  const py = await ready;
  let stdout = "";
  py.setStdout({ batched: (s) => (stdout += s + "\n") });
  py.setStderr({ batched: (s) => (stdout += s + "\n") });
  try {
    const run = py.globals.get("__fp_run");
    const results = JSON.parse(run(code, JSON.stringify(tests)));
    run.destroy();
    postMessage({ type: "result", id, results, stdout });
  } catch (err) {
    postMessage({ type: "result", id, results: null, stdout, error: String(err) });
  }
};
