"""Unit tests for the shared generate → check → retry plumbing in `app.service`."""

from typing import Any

import pytest
from pydantic import BaseModel

from app.errors import InvalidModelOutput, ModelUnavailable
from app.llm import LLMError
from app.service import Task, _generate, _generate_checked


class Out(BaseModel):
    value: int


class Ctx(BaseModel):
    pass


TASK = Task("test", "system", "low", 100)


class ScriptedLLM:
    """Returns (or raises) the scripted results in order and records the prompts it saw."""

    model = "scripted"

    def __init__(self, *script: Out | LLMError) -> None:
        self.script = list(script)
        self.prompts: list[str] = []

    async def generate(self, *, prompt: str, output: type[Any], **_: Any) -> Any:
        self.prompts.append(prompt)
        item = self.script.pop(0)
        if isinstance(item, LLMError):
            raise item
        return item


def prompt_for(feedback: list[str] | None) -> str:
    return f"feedback={feedback}"


async def accept_positive(out: Out, _attempt: int) -> tuple[int | None, list[str]]:
    return (out.value, []) if out.value > 0 else (None, ["value must be positive"])


async def test_accepts_first_valid_draft() -> None:
    llm = ScriptedLLM(Out(value=5))
    assert await _generate_checked(llm, TASK, Out, Ctx(), prompt_for, accept_positive) == 5
    assert llm.prompts == ["feedback=None"]


async def test_retries_with_validation_problems_as_feedback() -> None:
    llm = ScriptedLLM(Out(value=-1), Out(value=7))
    assert await _generate_checked(llm, TASK, Out, Ctx(), prompt_for, accept_positive) == 7
    assert llm.prompts[1] == "feedback=['value must be positive']"


async def test_gives_up_after_last_attempt_with_502() -> None:
    llm = ScriptedLLM(Out(value=-1), Out(value=-2))
    with pytest.raises(InvalidModelOutput) as exc:
        await _generate_checked(llm, TASK, Out, Ctx(), prompt_for, accept_positive)
    assert exc.value.status_code == 502


async def test_retryable_model_error_is_retried() -> None:
    llm = ScriptedLLM(LLMError("truncated", retryable=True), Out(value=3))
    assert await _generate_checked(llm, TASK, Out, Ctx(), prompt_for, accept_positive) == 3


async def test_non_retryable_model_error_fails_immediately_with_422() -> None:
    llm = ScriptedLLM(LLMError("declined", retryable=False))
    with pytest.raises(ModelUnavailable) as exc:
        await _generate_checked(llm, TASK, Out, Ctx(), prompt_for, accept_positive)
    assert exc.value.status_code == 422
    assert len(llm.prompts) == 1


async def test_single_attempt_maps_retryable_error_to_503() -> None:
    llm = ScriptedLLM(LLMError("rate limited", retryable=True))
    with pytest.raises(ModelUnavailable) as exc:
        await _generate(llm, TASK, "p", Out, Ctx())
    assert exc.value.status_code == 503
