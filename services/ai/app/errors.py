"""Service-layer errors. Raised by `service.py`, mapped to HTTP responses in `main.py`, so the
generation workflows don't depend on FastAPI."""


class ServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class ModelUnavailable(ServiceError):
    """The model call failed (503 if retrying later may help, 422 if the request itself was declined)."""

    def __init__(self, detail: str, *, retryable: bool) -> None:
        super().__init__(503 if retryable else 422, detail)


class InvalidModelOutput(ServiceError):
    """The model answered, but its output failed our checks even after a retry."""

    def __init__(self, detail: str) -> None:
        super().__init__(502, detail)
