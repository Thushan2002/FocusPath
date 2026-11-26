from datetime import UTC, datetime, timedelta

from app.domain.scheduler import FixedLadderScheduler
from app.schemas import RevisionRequest, WeakSubtopic

NOW = datetime(2026, 11, 8, 9, tzinfo=UTC)
sched = FixedLadderScheduler()


def test_ladder_is_1_3_7_14_30_days_after_learning() -> None:
    out = sched.schedule(
        RevisionRequest(now=NOW, learned_at=NOW, concept_title="Functions", mastery_score=85)
    )
    assert [i.interval_days for i in out.items] == [1, 3, 7, 14, 30]
    assert [i.due_at for i in out.items] == [NOW + timedelta(days=d) for d in (1, 3, 7, 14, 30)]
    assert out.scheduler_version == "ladder-v1"
    assert all(len(i.reason) > 10 for i in out.items)


def test_past_slots_are_skipped() -> None:
    learned = NOW - timedelta(days=5)
    out = sched.schedule(
        RevisionRequest(now=NOW, learned_at=learned, concept_title="Loops", mastery_score=90)
    )
    assert [i.interval_days for i in out.items] == [7, 14, 30]


def test_below_pass_mark_comes_back_next_day() -> None:
    out = sched.schedule(
        RevisionRequest(
            now=NOW,
            learned_at=NOW,
            concept_title="Functions",
            mastery_score=55,
            weak_subtopics=[WeakSubtopic(key="returns", title="Return statements")],
        )
    )
    first = out.items[0]
    assert first.due_at == NOW + timedelta(days=1)
    assert first.subtopic_key == "returns"
    assert first.kind == "practice"
    # The regular day-1 slot is merged into the next-day practice, later slots remain.
    assert [i.interval_days for i in out.items] == [1, 3, 7, 14, 30]
    assert sum(1 for i in out.items if i.interval_days == 1) == 1


def test_below_pass_without_weak_parts_still_returns_tomorrow() -> None:
    out = sched.schedule(RevisionRequest(now=NOW, learned_at=NOW, concept_title="OOP", mastery_score=40))
    assert out.items[0].due_at == NOW + timedelta(days=1)
    assert out.items[0].subtopic_key is None
