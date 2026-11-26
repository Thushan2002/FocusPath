from datetime import UTC, datetime, timedelta

from app.domain.mastery import CALC_VERSION, calculate
from app.schemas import Evidence, ExerciseEvidence, ExplanationEvidence, MasteryRequest, QuizEvidence

NOW = datetime(2026, 11, 8, 12, tzinfo=UTC)


def req(**evidence: object) -> MasteryRequest:
    return MasteryRequest(
        now=NOW,
        pass_mark=70,
        exercises_required=3,
        subtopic_keys=["params", "returns"],
        evidence=Evidence(**evidence),  # type: ignore[arg-type]
    )


def solve(key: str | None, alone: bool = True, days_ago: int = 0) -> ExerciseEvidence:
    return ExerciseEvidence(
        at=NOW - timedelta(days=days_ago), subtopic_key=key, solved_without_final_hint=alone
    )


def test_formula_weights_40_40_20() -> None:
    r = calculate(
        req(
            quiz=[QuizEvidence(at=NOW, score=1.0)],
            exercises=[solve("params"), solve("returns"), solve("params")],
            explanations=[ExplanationEvidence(at=NOW, score=1.0)],
        )
    )
    assert r.score == 100
    assert r.passed
    assert r.calc_version == CALC_VERSION

    only_quiz = calculate(req(quiz=[QuizEvidence(at=NOW, score=1.0)]))
    assert only_quiz.score == 40  # missing evidence counts as 0
    assert not only_quiz.passed


def test_final_hint_solves_do_not_count_as_practical() -> None:
    r = calculate(req(exercises=[solve("params", alone=False), solve("returns", alone=True)]))
    assert r.components.practical == round(1 / 3, 4)


def test_practical_is_capped_at_required() -> None:
    r = calculate(req(exercises=[solve("params") for _ in range(6)]))
    assert r.components.practical == 1.0


def test_recent_quiz_outweighs_older_quiz() -> None:
    r = calculate(
        req(quiz=[QuizEvidence(at=NOW - timedelta(days=14), score=0.2), QuizEvidence(at=NOW, score=0.8)])
    )
    # weights 0.5 and 1 → (0.1 + 0.8) / 1.5 = 0.6
    assert r.components.quiz == 0.6


def test_estimate_does_not_decay_with_time_alone() -> None:
    fresh = calculate(req(quiz=[QuizEvidence(at=NOW, score=0.9)]))
    old = calculate(req(quiz=[QuizEvidence(at=NOW - timedelta(days=60), score=0.9)]))
    assert fresh.score == old.score


def test_per_subtopic_breakdown_uses_available_evidence() -> None:
    r = calculate(
        req(
            quiz=[QuizEvidence(at=NOW, score=0.5, by_subtopic={"params": 1.0, "returns": 0.0})],
            exercises=[solve("params")],
        )
    )
    parts = {p.subtopic_key: p for p in r.per_subtopic}
    assert parts["params"].score == 100 and parts["params"].passed
    assert parts["returns"].score == 0 and not parts["returns"].passed


def test_no_evidence_is_zero_not_error() -> None:
    r = calculate(req())
    assert r.score == 0 and r.per_subtopic == []
