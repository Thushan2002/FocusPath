import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings


def require_internal_secret(
    settings: Annotated[Settings, Depends(get_settings)],
    x_internal_secret: Annotated[str | None, Header()] = None,
) -> None:
    """Only apps/web and apps/worker know the secret; the browser never talks to this service."""
    if not x_internal_secret or not hmac.compare_digest(x_internal_secret, settings.ai_service_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid internal secret")
