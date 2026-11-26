from datetime import UTC, datetime, timedelta

from app.domain.recommender import recommend
from app.schemas import ConceptState, DueRevision, RecommendationRequest, WeakPart

NOW = datetime(2026, 10, 31, 9, tzinfo=UTC)


def concepts(*statuses: str) -> list[ConceptState]:
    names = ["Variables", "Loops", "Functions", "OOP", "Files"]
    return [
        ConceptState(
            key=n.lower(),
            title=n,
            status=s,  # type: ignore[arg-type]
            mastery=90 if s == "mastered" else None,
            last_learned_at=NOW - timedelta(days=3) if s == "mastered" else None,
        )
        for n, s in zip(names, statuses, strict=False)
    ]


def test_due_revision_comes_first_with_reason() -> None:
    r = recommend(
        RecommendationRequest(
            now=NOW,
            focus_concept_key="functions",
            concepts=concepts("mastered", "mastered", "in_progress", "up_next", "locked"),
            due_revisions=[
                DueRevision(
                    id="r1",
                    concept_key="loops",
                    title="Loops — recall check",
                    due_at=NOW,
                    minutes=10,
                    kind="recall",
                )
            ],
        )
    )
    assert r.kind == "revise" and r.revision_id == "r1"
    assert r.title == "Revise: Loops"
    assert "3 days ago" in r.reason
    assert "Functions builds on it" in r.reason


def test_weak_part_of_focus_is_practised_before_moving_on() -> None:
    r = recommend(
        RecommendationRequest(
            now=NOW,
            focus_concept_key="functions",
            concepts=concepts("mastered", "mastered", "in_progress", "up_next", "locked"),
            weak_subtopics=[
                WeakPart(concept_key="functions", key="returns", title="Return values", score=45),
                WeakPart(concept_key="functions", key="lambda", title="Lambda functions", score=50),
            ],
        )
    )
    assert r.kind == "practice"
    assert r.title == "Practice return values before moving to OOP"
    assert "45%" in r.reason


def test_mastered_focus_moves_to_next_concept() -> None:
    r = recommend(
        RecommendationRequest(
            now=NOW,
            focus_concept_key="functions",
            concepts=concepts("mastered", "mastered", "mastered", "up_next", "locked"),
        )
    )
    assert r.kind == "learn" and r.concept_key == "oop"
    assert "mastered Functions" in r.reason


def test_everything_mastered_is_advance() -> None:
    r = recommend(
        RecommendationRequest(now=NOW, focus_concept_key=None, concepts=concepts("mastered", "mastered"))
    )
    assert r.kind == "advance"
    assert len(r.reason) >= 10
