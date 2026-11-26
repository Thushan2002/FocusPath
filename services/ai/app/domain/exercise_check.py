"""Verify generated exercises: the reference solution must pass its own tests, and the starter code
must not. Runs in an isolated subprocess with a timeout (the code is model output, not learner code).

The harness mirrors the browser runner in apps/web/src/lib/pyodide/harness.ts.
"""

import json
import os
import subprocess
import sys

from ..schemas import Exercise

HARNESS = r"""
import json, math, sys
payload = json.loads(sys.stdin.read())
ns = {"__name__": "__exercise__"}
out = []
try:
    exec(payload["code"], ns)
except BaseException as e:
    print(json.dumps([{"name": t["name"], "passed": False, "message": f"{type(e).__name__}: {e}"} for t in payload["tests"]]))
    sys.exit(0)
for t in payload["tests"]:
    try:
        actual = eval(t["call"], ns)
        expected = eval(t["expected"], ns)
        ok = actual == expected or (
            isinstance(actual, (int, float)) and isinstance(expected, (int, float))
            and not isinstance(actual, bool) and math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-9)
        )
        out.append({"name": t["name"], "passed": bool(ok), "message": None if ok else f"{actual!r} != {expected!r}"})
    except BaseException as e:
        out.append({"name": t["name"], "passed": False, "message": f"{type(e).__name__}: {e}"})
print(json.dumps(out))
"""


def run_tests(code: str, exercise: Exercise, timeout_s: float = 5.0) -> list[dict[str, object]]:
    payload = json.dumps({"code": code, "tests": [t.model_dump() for t in exercise.tests]})
    try:
        proc = subprocess.run(
            [sys.executable, "-I", "-S", "-c", HARNESS],
            input=payload,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            # Minimal environment; SYSTEMROOT is required for Python to start on Windows.
            env={k: v for k in ("SYSTEMROOT",) if (v := os.environ.get(k))},
        )
    except subprocess.TimeoutExpired:
        return [{"name": t.name, "passed": False, "message": "timeout"} for t in exercise.tests]
    try:
        result: list[dict[str, object]] = json.loads(proc.stdout.strip().splitlines()[-1])
        return result
    except (json.JSONDecodeError, IndexError):
        return [{"name": t.name, "passed": False, "message": proc.stderr[-300:]} for t in exercise.tests]


def exercise_problems(ex: Exercise) -> list[str]:
    problems: list[str] = []
    names = [t.name for t in ex.tests]
    if len(set(names)) != len(names):
        problems.append(f"'{ex.title}': test names must be unique")
    solution = run_tests(ex.solution, ex)
    failing = [r["name"] for r in solution if not r["passed"]]
    if failing:
        problems.append(f"'{ex.title}': reference solution fails its own tests {failing}")
    starter = run_tests(ex.starter_code, ex)
    if starter and all(r["passed"] for r in starter):
        problems.append(f"'{ex.title}': starter code already passes every test")
    return problems
