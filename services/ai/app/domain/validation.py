"""Semantic checks that a JSON schema can't express. Problems are fed back to the model on retry."""

from ..schemas import RoadmapDraft, RoadmapRequest

PASS_MARK = 70


def roadmap_problems(draft: RoadmapDraft, req: RoadmapRequest) -> list[str]:
    problems: list[str] = []
    concepts = [c for m in draft.modules for c in m.concepts]
    keys = [c.key for c in concepts]

    dupes = {k for k in keys if keys.count(k) > 1}
    if dupes:
        problems.append(f"Concept keys must be unique; duplicated: {sorted(dupes)}")
    mod_keys = [m.key for m in draft.modules]
    if len(set(mod_keys)) != len(mod_keys):
        problems.append("Module keys must be unique")

    seen: set[str] = set()
    for c in concepts:
        for p in c.prerequisites:
            if p == c.key:
                problems.append(f"{c.key} lists itself as a prerequisite")
            elif p not in keys:
                problems.append(f"{c.key} requires unknown concept '{p}'")
            elif p not in seen:
                problems.append(
                    f"{c.key} requires '{p}', which appears later — order concepts so prerequisites come first"
                )
        seen.add(c.key)
        sub_keys = [s.key for s in c.subtopics]
        if len(set(sub_keys)) != len(sub_keys):
            problems.append(f"{c.key} has duplicate subtopic keys")
        kinds = [t.kind for t in c.task_templates]
        for required in ("learn", "assessment"):
            if required not in kinds:
                problems.append(f"{c.key} needs a '{required}' task")
        if "coding" not in kinds and "mini_project" not in kinds:
            problems.append(f"{c.key} needs a 'coding' task so learners produce practical evidence")

    total_minutes = sum(c.est_minutes for c in concepts)
    budget = req.daily_minutes * 30 * req.target_months
    if total_minutes > budget * 1.25:
        problems.append(
            f"The plan needs ~{total_minutes // 60} h but the learner has ~{budget // 60} h "
            f"({req.daily_minutes} min/day for {req.target_months} months). Trim scope."
        )
    return problems


def normalize_roadmap(draft: RoadmapDraft) -> RoadmapDraft:
    """Enforce product rules the model must not change: the pass mark is 70%."""
    for m in draft.modules:
        for c in m.concepts:
            c.criteria.quiz_pass_pct = PASS_MARK
    return draft
