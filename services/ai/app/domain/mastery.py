"""Mastery estimate, rule v1 (product rule 2). Deterministic — no LLM involved.

    score = 100 * (0.4 * quiz + 0.4 * practical + 0.2 * explanation)

* quiz        recency-weighted mean of quiz scores (0–1)
* practical   distinct exercises solved without the final (answer) hint, divided by the
              number the concept requires, capped at 1
* explanation recency-weighted mean of AI-scored written explanations (0–1)

Recency weighting uses a 14-day half-life *relative to other evidence*: a newer attempt outweighs an
older one, but an estimate never decays on its own with the passage of time. Missing evidence
counts as 0, so no concept can pass on one kind of evidence alone. It is an estimate, not a grade.

The per-subtopic breakdown re-normalises the weights over the evidence that exists for that part.
"""

from collections.abc import Iterable
from datetime import datetime

from ..schemas import Components, Counts, MasteryRequest, MasteryResult, SubtopicMastery

CALC_VERSION = "rule-v1"
WEIGHTS = {"quiz": 0.4, "practical": 0.4, "explanation": 0.2}
HALF_LIFE_DAYS = 14.0


def _weighted_mean(points: Iterable[tuple[float, datetime]]) -> float | None:
    pts = list(points)
    if not pts:
        return None
    newest = max(at for _, at in pts)
    total = weight_sum = 0.0
    for value, at in pts:
        age_days = (newest - at).total_seconds() / 86400
        w = 0.5 ** (age_days / HALF_LIFE_DAYS)
        total += w * value
        weight_sum += w
    return total / weight_sum


def calculate(req: MasteryRequest) -> MasteryResult:
    ev = req.evidence
    quiz = _weighted_mean((q.score, q.at) for q in ev.quiz) or 0.0
    qualifying = sum(1 for e in ev.exercises if e.solved_without_final_hint)
    practical = min(1.0, qualifying / req.exercises_required)
    explanation = _weighted_mean((e.score, e.at) for e in ev.explanations) or 0.0

    score = 100 * (
        WEIGHTS["quiz"] * quiz + WEIGHTS["practical"] * practical + WEIGHTS["explanation"] * explanation
    )
    score = round(min(100.0, max(0.0, score)), 1)

    per_subtopic: list[SubtopicMastery] = []
    for key in req.subtopic_keys:
        parts: list[tuple[float, float]] = []
        q = _weighted_mean((a.by_subtopic[key], a.at) for a in ev.quiz if key in a.by_subtopic)
        if q is not None:
            parts.append((WEIGHTS["quiz"], q))
        solves = [e for e in ev.exercises if e.subtopic_key == key]
        if solves:
            parts.append(
                (WEIGHTS["practical"], 1.0 if any(e.solved_without_final_hint for e in solves) else 0.0)
            )
        if ev.explanations:
            parts.append((WEIGHTS["explanation"], explanation))
        if not parts or (q is None and not solves):
            continue  # no direct evidence for this part yet
        sub = 100 * sum(w * v for w, v in parts) / sum(w for w, _ in parts)
        sub = round(sub, 1)
        per_subtopic.append(SubtopicMastery(subtopic_key=key, score=sub, passed=sub >= req.pass_mark))

    return MasteryResult(
        score=score,
        passed=score >= req.pass_mark,
        components=Components(
            quiz=round(quiz, 4), practical=round(practical, 4), explanation=round(explanation, 4)
        ),
        counts=Counts(quiz=len(ev.quiz), exercises=len(ev.exercises), explanations=len(ev.explanations)),
        per_subtopic=per_subtopic,
        calc_version=CALC_VERSION,
    )
