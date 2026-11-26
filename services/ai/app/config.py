from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(ROOT_ENV, ".env"), extra="ignore")

    ai_service_secret: str
    anthropic_api_key: str = ""
    # "fake" serves deterministic fixtures: no API key needed (local dev, E2E tests).
    ai_mode: Literal["live", "fake"] = "live"
    ai_model: str = "claude-opus-5-5"
    # Server-side refusal fallback (routes a declined request to another model).
    ai_fallbacks: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
