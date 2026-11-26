"""LLM access. `AnthropicLLM` calls Claude with structured outputs (`messages.parse` + Pydantic);
`FakeLLM` returns deterministic fixtures for local dev and E2E tests."""

import logging
from typing import Any, Literal, Protocol, TypeVar

import anthropic
from pydantic import BaseModel, ValidationError

from . import fakes
from .config import Settings

log = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)
Effort = Literal["low", "medium", "high", "xhigh", "max"]


class LLMError(Exception):
    def __init__(self, message: str, *, retryable: bool) -> None:
        super().__init__(message)
        self.retryable = retryable


class LLM(Protocol):
    model: str

    async def generate(
        self,
        *,
        task: str,
        system: str,
        prompt: str,
        output: type[T],
        effort: Effort,
        max_tokens: int,
        context: BaseModel,
    ) -> T: ...


class AnthropicLLM:
    def __init__(self, settings: Settings) -> None:
        self.model = settings.ai_model
        self._fallbacks = settings.ai_fallbacks
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or None, max_retries=2)

    async def generate(
        self,
        *,
        task: str,
        system: str,
        prompt: str,
        output: type[T],
        effort: Effort,
        max_tokens: int,
        context: BaseModel,
    ) -> T:
        extra: dict[str, Any] = {}
        if self._fallbacks:
            # On a policy decline the API re-runs the request on a fallback model inside the same call.
            extra = {
                "extra_headers": {"anthropic-beta": "server-side-fallback-2026-07-01"},
                "extra_body": {"fallbacks": "default"},
            }
        try:
            response = await self._client.messages.parse(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_config={"effort": effort},
                output_format=output,
                **extra,
            )
        except ValidationError as e:
            raise LLMError(f"{task}: output failed validation: {e}", retryable=True) from e
        except anthropic.RateLimitError as e:
            raise LLMError(f"{task}: rate limited", retryable=True) from e
        except anthropic.APIStatusError as e:
            raise LLMError(f"{task}: API error {e.status_code}", retryable=e.status_code >= 500) from e
        except anthropic.APIConnectionError as e:
            raise LLMError(f"{task}: connection error", retryable=True) from e

        if response.stop_reason == "refusal":
            raise LLMError(f"{task}: request declined", retryable=False)
        if response.stop_reason == "max_tokens":
            raise LLMError(f"{task}: output truncated at max_tokens", retryable=True)
        if response.parsed_output is None:
            raise LLMError(f"{task}: no structured output", retryable=True)
        log.info("llm %s ok in=%s out=%s", task, response.usage.input_tokens, response.usage.output_tokens)
        return response.parsed_output


class FakeLLM:
    model = "fake"

    async def generate(
        self,
        *,
        task: str,
        system: str,
        prompt: str,
        output: type[T],
        effort: Effort,
        max_tokens: int,
        context: BaseModel,
    ) -> T:
        return output.model_validate(fakes.respond(task, context))


def build_llm(settings: Settings) -> LLM:
    return FakeLLM() if settings.ai_mode == "fake" else AnthropicLLM(settings)
