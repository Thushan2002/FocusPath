"""Generation workflows: call the model, validate beyond the schema, retry once with feedback.

Each model-backed task is described by a `Task` spec (prompt, effort, token budget). Adding a new
task means adding a spec and a workflow function — the call/error/retry plumbing is shared.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from pydantic import BaseModel

from . import prompts
from .domain.exercise_check import exercise_problems
from .domain.validation import normalize_roadmap, roadmap_problems
from .errors import InvalidModelOutput, ModelUnavailable
from .llm import LLM, Effort, LLMError
from .schemas import (
    Assessment,
    AssessmentRequest,
    ExerciseRequest,
    Exercises,
    ExplanationDraft,
    ExplanationEvaluation,
    ExplanationRequest,
    HintDraft,
    HintRequest,
    HintResponse,
    RoadmapDraft,
    RoadmapRequest,
    RoadmapResponse,
    Rubric,
    TutorReply,
    TutorRequest,
)

log = logging.getLogger(__name__)

# Mirrors MAX_HINT_LEVEL in packages/shared/src/enums.ts: the last hint reveals the answer.
MAX_HINT_LEVEL = 3
MIN_VALID_QUESTIONS = 3
QUESTION_OPTIONS = 4
# Accuracy matters most; a fluent but wrong explanation shouldn't pass.
RUBRIC_WEIGHTS = {"accuracy": 0.5, "completeness": 0.3, "own_words": 0.2}


@dataclass(frozen=True)
class Task:
    name: str
    system: str
    effort: Effort
    max_tokens: int


ROADMAP = Task("roadmap", prompts.ROADMAP_SYSTEM, "high", 32000)
ASSESSMENT = Task("assessment", prompts.ASSESSMENT_SYSTEM, "medium", 16000)
EXERCISES = Task("exercises", prompts.EXERCISE_SYSTEM, "medium", 16000)
HINT = Task("hint", prompts.HINT_SYSTEM, "low", 4000)
TUTOR = Task("tutor", prompts.TUTOR_SYSTEM, "low", 8000)
EXPLANATION = Task("explanation", prompts.EXPLANATION_SYSTEM, "low", 4000)


async def _call[T: BaseModel](llm: LLM, task: Task, prompt: str, output: type[T], context: BaseModel) -> T:
    """One model call; raises `LLMError` unchanged so callers can decide whether to retry."""
    return await llm.generate(
        task=task.name,
        system=task.system,
        prompt=prompt,
        output=output,
        effort=task.effort,
        max_tokens=task.max_tokens,
        context=context,
    )


def _unavailable(err: LLMError) -> ModelUnavailable:
    log.warning("llm failure: %s", err)
    return ModelUnavailable(str(err), retryable=err.retryable)


async def _generate[T: BaseModel](
    llm: LLM, task: Task, prompt: str, output: type[T], context: BaseModel
) -> T:
    """Single attempt: any model failure becomes a `ModelUnavailable`."""
    try:
        return await _call(llm, task, prompt, output, context)
    except LLMError as e:
        raise _unavailable(e) from e


# (draft, attempt) -> (accepted result or None, problems to feed back to the model)
type Check[T, R] = Callable[[T, int], Awaitable[tuple[R | None, list[str]]]]


async def _generate_checked[T: BaseModel, R](
    llm: LLM,
    task: Task,
    output: type[T],
    context: BaseModel,
    prompt_for: Callable[[list[str] | None], str],
    check: Check[T, R],
    attempts: int = 2,
) -> R:
    """Generate, validate beyond the schema, and retry with the problems as feedback.

    A retryable model error on a non-final attempt is also fed back and retried.
    """
    feedback: list[str] | None = None
    for attempt in range(attempts):
        last = attempt == attempts - 1
        try:
            draft = await _call(llm, task, prompt_for(feedback), output, context)
        except LLMError as e:
            if not last and e.retryable:
                feedback = [str(e)]
                continue
            raise _unavailable(e) from e
        result, problems = await check(draft, attempt)
        if result is not None:
            return result
        log.info("%s attempt %s rejected: %s", task.name, attempt, problems)
        feedback = problems
    raise InvalidModelOutput(f"{task.name} failed validation: {feedback}")


# ---------- Workflows ----------


async def generate_roadmap(llm: LLM, req: RoadmapRequest) -> RoadmapResponse:
    async def check(draft: RoadmapDraft, _attempt: int) -> tuple[RoadmapResponse | None, list[str]]:
        problems = roadmap_problems(draft, req)
        if problems:
            return None, problems
        return RoadmapResponse(
            roadmap=normalize_roadmap(draft), model=llm.model, prompt_version=prompts.PROMPT_VERSION
        ), []

    return await _generate_checked(
        llm, ROADMAP, RoadmapDraft, req, lambda fb: prompts.roadmap_prompt(req, fb), check
    )


async def generate_assessment(llm: LLM, req: AssessmentRequest) -> Assessment:
    out = await _generate(llm, ASSESSMENT, prompts.assessment_prompt(req), Assessment, req)
    valid = {s.key for s in req.concept.subtopics}
    fallback = req.concept.subtopics[0].key
    for q in out.questions:
        if q.subtopic_key not in valid:
            q.subtopic_key = fallback
    # Four distinct options, or the question is ambiguous.
    out.questions = [q for q in out.questions if len(set(q.options)) == QUESTION_OPTIONS][: req.count]
    if len(out.questions) < MIN_VALID_QUESTIONS:
        raise InvalidModelOutput("too few valid questions")
    return out


async def generate_exercises(llm: LLM, req: ExerciseRequest) -> Exercises:
    valid_keys = {s.key for s in req.concept.subtopics}
    final_attempt = 1

    async def check(out: Exercises, attempt: int) -> tuple[Exercises | None, list[str]]:
        good, problems = [], []
        for ex in out.exercises:
            if ex.subtopic_key not in valid_keys:
                ex.subtopic_key = req.concept.subtopics[0].key
            # Runs the reference solution against the tests; off the event loop.
            p = await asyncio.to_thread(exercise_problems, ex)
            if p:
                problems += p
            else:
                good.append(ex)
        # Accept a full set, or whatever passed on the last attempt.
        if good and (len(good) >= req.count or attempt == final_attempt):
            return Exercises(exercises=good), problems
        return None, problems

    return await _generate_checked(
        llm, EXERCISES, Exercises, req, lambda fb: prompts.exercise_prompt(req, fb), check
    )


async def hint(llm: LLM, req: HintRequest) -> HintResponse:
    draft = await _generate(llm, HINT, prompts.hint_prompt(req), HintDraft, req)
    return HintResponse(level=req.level, hint=draft.hint, reveals_answer=req.level >= MAX_HINT_LEVEL)


async def tutor_reply(llm: LLM, req: TutorRequest) -> TutorReply:
    return await _generate(llm, TUTOR, prompts.tutor_prompt(req), TutorReply, req)


def explanation_score(rubric: Rubric) -> float:
    """Weighted rubric score in [0, 1]."""
    score = (
        RUBRIC_WEIGHTS["accuracy"] * rubric.accuracy
        + RUBRIC_WEIGHTS["completeness"] * rubric.completeness
        + RUBRIC_WEIGHTS["own_words"] * rubric.own_words
    )
    return round(score, 3)


async def evaluate_explanation(llm: LLM, req: ExplanationRequest) -> ExplanationEvaluation:
    draft = await _generate(llm, EXPLANATION, prompts.explanation_prompt(req), ExplanationDraft, req)
    return ExplanationEvaluation(**draft.model_dump(), score=explanation_score(draft.rubric))
