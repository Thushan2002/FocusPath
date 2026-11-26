import os

import pytest
from fastapi.testclient import TestClient

os.environ["AI_SERVICE_SECRET"] = "test-secret"
os.environ["AI_MODE"] = "fake"

from app.config import get_settings
from app.main import app

SECRET = {"x-internal-secret": "test-secret"}


@pytest.fixture
def client() -> TestClient:
    get_settings.cache_clear()
    return TestClient(app)
