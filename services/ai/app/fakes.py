"""Deterministic fixtures for AI_MODE=fake (local dev without an API key, and E2E tests).
They are shaped like real model output and pass the same validation."""

from typing import Any

from pydantic import BaseModel

from .schemas import (
    AssessmentRequest,
    ExerciseRequest,
    ExplanationRequest,
    HintRequest,
    RoadmapRequest,
    TutorRequest,
)


def _tasks(topic: str) -> list[dict[str, Any]]:
    return [
        {"kind": "learn", "title": f"Learn: what {topic.lower()} are and when to use them", "minutes": 20},
        {"kind": "explain", "title": f"Explain {topic.lower()} in your own words", "minutes": 15},
        {"kind": "coding", "title": f"Solve 3 coding exercises on {topic.lower()}", "minutes": 35},
        {"kind": "assessment", "title": f"Take the {topic} quiz", "minutes": 10},
    ]


def _concept(key: str, title: str, prereqs: list[str], subs: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "key": key,
        "title": title,
        "summary": f"Understand and use {title.lower()} confidently in real code.",
        "estMinutes": 240,
        "prerequisites": prereqs,
        "subtopics": [{"key": k, "title": t} for k, t in subs],
        "criteria": {"quizPassPct": 70, "exercisesRequired": 3, "explanationRequired": True},
        "taskTemplates": _tasks(title),
    }


def roadmap(req: RoadmapRequest) -> dict[str, Any]:
    return {
        "title": req.goal,
        "summary": f"A focused path to {req.goal.lower()}, starting from the fundamentals you need first.",
        "modules": [
            {
                "key": "python-fundamentals",
                "title": "Python fundamentals",
                "milestone": "Build a CLI expense tracker",
                "estWeeks": 3,
                "concepts": [
                    _concept(
                        "variables",
                        "Variables and data types",
                        [],
                        [
                            ("numbers-strings", "Numbers, strings, booleans"),
                            ("collections", "Lists, tuples, dicts"),
                            ("type-conversion", "Type conversion"),
                        ],
                    ),
                    _concept(
                        "functions",
                        "Functions",
                        ["variables"],
                        [
                            ("declaration", "Function declaration"),
                            ("parameters", "Parameters"),
                            ("return-values", "Return statements"),
                            ("defaults", "Default arguments"),
                        ],
                    ),
                    _concept(
                        "oop",
                        "Object-oriented programming",
                        ["functions"],
                        [
                            ("classes", "Classes and objects"),
                            ("methods", "Attributes and methods"),
                            ("inheritance", "Inheritance"),
                        ],
                    ),
                ],
            },
            {
                "key": "data-analysis",
                "title": "Data analysis",
                "milestone": "Analyse a real CSV dataset and chart the result",
                "estWeeks": 3,
                "concepts": [
                    _concept(
                        "numpy",
                        "NumPy arrays",
                        ["functions"],
                        [
                            ("arrays", "Creating arrays"),
                            ("vectorization", "Vectorised operations"),
                        ],
                    ),
                    _concept(
                        "pandas",
                        "pandas DataFrames",
                        ["numpy"],
                        [
                            ("dataframes", "DataFrames and Series"),
                            ("grouping", "Filtering and grouping"),
                        ],
                    ),
                ],
            },
        ],
    }


def assessment(req: AssessmentRequest) -> dict[str, Any]:
    subs = req.concept.subtopics
    questions = []
    for i in range(req.count):
        s = subs[i % len(subs)]
        questions.append(
            {
                "subtopicKey": s.key,
                "prompt": f"Q{i + 1}. Which statement about {s.title.lower()} is correct?",
                "options": [
                    f"The correct statement about {s.title.lower()}",
                    "A common misconception",
                    "An unrelated fact",
                    "None of the above",
                ],
                "correctIndex": 0,
                "rationale": "The first option is correct; the second is the most common mistake.",
            }
        )
    return {"questions": questions}


def exercises(req: ExerciseRequest) -> dict[str, Any]:
    subs = req.concept.subtopics
    out = []
    for i in range(req.count):
        s = subs[i % len(subs)]
        factor = i + 2
        out.append(
            {
                "subtopicKey": s.key,
                "title": f"Exercise {i + 1} — scale it",
                "prompt": f"Complete `scale(x)` so it returns x multiplied by {factor}.",
                "starterCode": f"def scale(x):\n    result = x * {factor}\n    print(result)\n",
                "tests": [
                    {"name": "scales 2", "call": "scale(2)", "expected": str(2 * factor)},
                    {"name": "scales 0", "call": "scale(0)", "expected": "0"},
                ],
                "solution": f"def scale(x):\n    return x * {factor}\n",
                "isProject": False,
            }
        )
    if req.include_project:
        out.append(
            {
                "subtopicKey": subs[0].key,
                "title": "Mini-project — tiny calculator",
                "prompt": "Write `calc(a, op, b)` supporting '+', '-', '*' and '/'.",
                "starterCode": "def calc(a, op, b):\n    pass\n",
                "tests": [
                    {"name": "adds", "call": "calc(2, '+', 3)", "expected": "5"},
                    {"name": "divides", "call": "calc(9, '/', 3)", "expected": "3.0"},
                ],
                "solution": (
                    "def calc(a, op, b):\n"
                    "    return {'+': a + b, '-': a - b, '*': a * b, '/': a / b if b else None}[op]\n"
                ),
                "isProject": True,
            }
        )
    return {"exercises": out}


def hint(req: HintRequest) -> dict[str, Any]:
    texts = {
        1: "Look at the last line of your function. What does it give back to the caller?",
        2: "A function with no return statement returns None automatically.",
        3: "Replace print(...) with return ... so the caller receives the value.",
    }
    return {"hint": texts[req.level]}


def tutor(req: TutorRequest) -> dict[str, Any]:
    return {
        "blocks": [
            {
                "type": "text",
                "text": f"Good question about {req.concept.title.lower()}. "
                "print shows a value on screen; return hands it back to the caller.",
            },
            {
                "type": "code",
                "code": "total = scale(2)\ntotal + 5  # works only with return",
                "language": "python",
            },
        ],
        "followups": ["Can you show another example?", "When should I print instead?"],
    }


def explanation(req: ExplanationRequest) -> dict[str, Any]:
    words = len(req.text.split())
    good = min(1.0, words / 25)
    return {
        "rubric": {"accuracy": round(0.4 + 0.6 * good, 2), "completeness": round(good, 2), "ownWords": 0.9},
        "feedback": "Clear and in your own words. Add one example of when you'd use it.",
        "misconceptions": [],
    }


_HANDLERS: dict[str, Any] = {
    "roadmap": roadmap,
    "assessment": assessment,
    "exercises": exercises,
    "hint": hint,
    "tutor": tutor,
    "explanation": explanation,
}


def respond(task: str, context: BaseModel) -> dict[str, Any]:
    result: dict[str, Any] = _HANDLERS[task](context)
    return result
