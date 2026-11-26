import copy

from app import fakes
from app.domain.exercise_check import exercise_problems, run_tests
from app.domain.validation import normalize_roadmap, roadmap_problems
from app.schemas import ConceptContext, Exercise, ExerciseRequest, RoadmapDraft, RoadmapRequest, Subtopic

REQ = RoadmapRequest(
    goal="Become an AI Engineer",
    level="beginner",
    daily_minutes=120,
    target_months=6,
    struggle="inconsistency",
)


def draft() -> RoadmapDraft:
    return RoadmapDraft.model_validate(fakes.roadmap(REQ))


def test_fake_roadmap_is_valid() -> None:
    assert roadmap_problems(draft(), REQ) == []


def test_unknown_and_out_of_order_prerequisites() -> None:
    raw = copy.deepcopy(fakes.roadmap(REQ))
    raw["modules"][0]["concepts"][0]["prerequisites"] = ["functions"]  # later concept
    raw["modules"][0]["concepts"][1]["prerequisites"] = ["does-not-exist"]
    problems = roadmap_problems(RoadmapDraft.model_validate(raw), REQ)
    assert any("appears later" in p for p in problems)
    assert any("unknown concept" in p for p in problems)


def test_missing_assessment_task_is_rejected() -> None:
    raw = copy.deepcopy(fakes.roadmap(REQ))
    raw["modules"][0]["concepts"][0]["taskTemplates"] = [
        t for t in raw["modules"][0]["concepts"][0]["taskTemplates"] if t["kind"] != "assessment"
    ]
    assert any("'assessment' task" in p for p in roadmap_problems(RoadmapDraft.model_validate(raw), REQ))


def test_plan_must_fit_time_budget() -> None:
    tiny = REQ.model_copy(update={"daily_minutes": 15, "target_months": 1})
    assert any("Trim scope" in p for p in roadmap_problems(draft(), tiny))


def test_pass_mark_is_forced_to_70() -> None:
    d = draft()
    d.modules[0].concepts[0].criteria.quiz_pass_pct = 50
    assert normalize_roadmap(d).modules[0].concepts[0].criteria.quiz_pass_pct == 70


def _exercise() -> Exercise:
    ctx = ConceptContext(
        key="functions",
        title="Functions",
        summary="Functions",
        subtopics=[Subtopic(key="returns", title="Returns")],
    )
    raw = fakes.exercises(ExerciseRequest(concept=ctx, level="beginner", count=1, include_project=False))
    return Exercise.model_validate(raw["exercises"][0])


def test_reference_solution_passes_and_starter_fails() -> None:
    ex = _exercise()
    assert exercise_problems(ex) == []
    starter = run_tests(ex.starter_code, ex)
    assert not any(r["passed"] for r in starter)
    assert "None != 4" in str(starter[0]["message"])


def test_broken_solution_is_reported() -> None:
    ex = _exercise().model_copy(update={"solution": "def scale(x):\n    return x\n"})
    assert any("fails its own tests" in p for p in exercise_problems(ex))


def test_infinite_loop_times_out() -> None:
    ex = _exercise()
    out = run_tests("while True:\n    pass\n", ex, timeout_s=1)
    assert all(r["message"] == "timeout" for r in out)
