"""Spaced-repetition scheduling behind a small interface so FSRS can replace it later (ADR 0004)."""

from datetime import datetime, timedelta
from typing import Literal, Protocol

from ..schemas import RevisionItem, RevisionRequest, RevisionSchedule

Kind = Literal["practice", "recall", "apply", "retention"]


class Scheduler(Protocol):
    version: str

    def schedule(self, req: RevisionRequest) -> RevisionSchedule: ...


class FixedLadderScheduler:
    """MVP: reviews on day 1, 3, 7, 14 and 30 after learning; anything below the pass mark
    comes back the next day."""

    version = "ladder-v1"
    LADDER: tuple[tuple[int, Kind, int, str], ...] = (
        (1, "recall", 10, "recall quiz"),
        (3, "recall", 10, "recall check"),
        (7, "practice", 20, "practice exercise"),
        (14, "apply", 30, "apply in a project"),
        (30, "retention", 10, "retention check"),
    )

    def schedule(self, req: RevisionRequest) -> RevisionSchedule:
        items: list[RevisionItem] = []
        below = req.mastery_score < req.pass_mark
        tomorrow = req.now + timedelta(days=1)

        if below:
            weak = req.weak_subtopics or []
            for w in weak[:3]:
                items.append(
                    RevisionItem(
                        due_at=tomorrow,
                        interval_days=1,
                        kind="practice",
                        subtopic_key=w.key,
                        title=f"{w.title} — practice",
                        reason=f"{w.title} is below the {req.pass_mark}% line, so it comes back tomorrow "
                        "instead of waiting for the normal schedule.",
                        minutes=15,
                    )
                )
            if not weak:
                items.append(
                    RevisionItem(
                        due_at=tomorrow,
                        interval_days=1,
                        kind="practice",
                        subtopic_key=None,
                        title=f"{req.concept_title} — practice",
                        reason=f"Your estimate is below the {req.pass_mark}% line, so this concept comes back "
                        "tomorrow.",
                        minutes=15,
                    )
                )

        for day, kind, minutes, label in self.LADDER:
            due = req.learned_at + timedelta(days=day)
            if due <= req.now:
                continue
            if below and due <= tomorrow + timedelta(hours=12):
                continue  # the next-day practice above already covers this slot
            items.append(
                RevisionItem(
                    due_at=due,
                    interval_days=day,
                    kind=kind,
                    subtopic_key=None,
                    title=f"{req.concept_title} — {label}",
                    reason=_ladder_reason(day),
                    minutes=minutes,
                )
            )

        items.sort(key=lambda i: i.due_at)
        return RevisionSchedule(items=items, scheduler_version=self.version)


def _ladder_reason(day: int) -> str:
    return (
        f"Day-{day} review: recalling it just as it starts to fade is the cheapest way to keep it for longer."
    )


def default_scheduler() -> Scheduler:
    return FixedLadderScheduler()


def days_between(a: datetime, b: datetime) -> int:
    return max(0, round((b - a).total_seconds() / 86400))
