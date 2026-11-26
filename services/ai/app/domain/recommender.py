"""Next-step recommendation, rule-based for the MVP. Every result carries a human-readable "why"
(product rule 4). Priority: due revision → weak part of today's focus → continue focus → next
concept on the path → roadmap complete."""

from ..schemas import ConceptState, Recommendation, RecommendationRequest
from .scheduler import days_between


def recommend(req: RecommendationRequest) -> Recommendation:
    by_key = {c.key: c for c in req.concepts}
    focus = by_key.get(req.focus_concept_key) if req.focus_concept_key else None

    # 1. A revision that's due beats new material: it's the cheapest way to keep what's learned.
    due = sorted((d for d in req.due_revisions if d.concept_key in by_key), key=lambda d: d.due_at)
    if due:
        d = due[0]
        c = by_key[d.concept_key]
        ago = days_between(c.last_learned_at, req.now) if c.last_learned_at else None
        when = f"{ago} day{'s' if ago != 1 else ''} ago" if ago is not None else "recently"
        builds = (
            f" — and {focus.title} builds on it"
            if focus and focus.key != c.key and _index(req.concepts, focus) > _index(req.concepts, c)
            else ""
        )
        return Recommendation(
            kind="revise",
            concept_key=c.key,
            title=f"Revise: {c.title}",
            detail=f"{d.title} · {d.minutes} min",
            reason=f"You learned {c.title} {when}. A short recall now is the cheapest way to keep it{builds}.",
            est_minutes=d.minutes,
            revision_id=d.id,
        )

    nxt = _next_concept(req.concepts, after=focus)

    # 2. Today's focus has a weak part: close the gap before moving on.
    if focus and focus.status != "mastered":
        weak = sorted((w for w in req.weak_subtopics if w.concept_key == focus.key), key=lambda w: w.score)
        if weak:
            w = weak[0]
            before = f" before moving to {nxt.title}" if nxt else ""
            return Recommendation(
                kind="practice",
                concept_key=focus.key,
                title=f"Practice {w.title.lower()}{before}",
                detail="Targeted exercises · ≈ 30 min",
                reason=(
                    f"Your estimate for {w.title} is {round(w.score)}%, below the {req.pass_mark}% line. "
                    + (
                        f"{nxt.title} builds on it, so closing this gap now saves time later."
                        if nxt
                        else "Closing this gap now is cheaper than relearning it later."
                    )
                ),
                est_minutes=30,
                revision_id=None,
            )
        return Recommendation(
            kind="learn",
            concept_key=focus.key,
            title=f"Continue: {focus.title}",
            detail="Finish today's tasks, then take the quiz",
            reason=(
                f"{focus.title} is today's focus and isn't proven yet. Finishing it before starting "
                "something new is how one milestone at a time works."
            ),
            est_minutes=45,
            revision_id=None,
        )

    # 3. Focus mastered (or none set): the next concept whose prerequisites are done.
    if nxt:
        why = (
            f"You've mastered {focus.title}. {nxt.title} is next on your path and its prerequisites are done."
            if focus
            else f"{nxt.title} is the next concept on your path and its prerequisites are done."
        )
        return Recommendation(
            kind="learn",
            concept_key=nxt.key,
            title=f"Start: {nxt.title}",
            detail="Set it as today's focus",
            reason=why,
            est_minutes=45,
            revision_id=None,
        )

    last = req.concepts[-1]
    return Recommendation(
        kind="advance",
        concept_key=last.key,
        title="Review your roadmap",
        detail="Every concept is above the pass line",
        reason="Every concept on this roadmap is above the pass line. Keep up the scheduled revisions or extend your plan.",
        est_minutes=15,
        revision_id=None,
    )


def _index(concepts: list[ConceptState], c: ConceptState) -> int:
    return next(i for i, x in enumerate(concepts) if x.key == c.key)


def _next_concept(concepts: list[ConceptState], after: ConceptState | None) -> ConceptState | None:
    start = _index(concepts, after) + 1 if after else 0
    for c in concepts[start:] + concepts[:start]:
        if c.status in ("up_next", "in_progress") and (after is None or c.key != after.key):
            return c
    return None
