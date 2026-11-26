import logging
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from . import service
from .auth import require_internal_secret
from .config import Settings, get_settings
from .domain import mastery, recommender
from .domain.scheduler import Scheduler, default_scheduler
from .errors import ServiceError
from .llm import LLM, build_llm
from .schemas import (
    Assessment,
    AssessmentRequest,
    ExerciseRequest,
    Exercises,
    ExplanationEvaluation,
    ExplanationRequest,
    HintRequest,
    HintResponse,
    MasteryRequest,
    MasteryResult,
    Recommendation,
    RecommendationRequest,
    RevisionRequest,
    RevisionSchedule,
    RoadmapRequest,
    RoadmapResponse,
    TutorReply,
    TutorRequest,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

_llm: LLM | None = None


def get_llm(settings: Annotated[Settings, Depends(get_settings)]) -> LLM:
    global _llm
    if _llm is None:
        _llm = build_llm(settings)
    return _llm


def get_scheduler() -> Scheduler:
    return default_scheduler()


LLMDep = Annotated[LLM, Depends(get_llm)]

app = FastAPI(title="FocusPath AI service", version="0.1.0", docs_url="/docs", redoc_url=None)
v1 = APIRouter(prefix="/v1", dependencies=[Depends(require_internal_secret)])


@app.exception_handler(ServiceError)
async def service_error_handler(_req: Request, exc: ServiceError) -> JSONResponse:
    """Service errors keep FastAPI's `{"detail": ...}` error shape."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/healthz")
def healthz(settings: Annotated[Settings, Depends(get_settings)]) -> dict[str, str]:
    return {"status": "ok", "mode": settings.ai_mode}


@v1.post("/roadmaps/generate")
async def roadmaps_generate(req: RoadmapRequest, llm: LLMDep) -> RoadmapResponse:
    return await service.generate_roadmap(llm, req)


@v1.post("/assessments/generate")
async def assessments_generate(req: AssessmentRequest, llm: LLMDep) -> Assessment:
    return await service.generate_assessment(llm, req)


@v1.post("/exercises/generate")
async def exercises_generate(req: ExerciseRequest, llm: LLMDep) -> Exercises:
    return await service.generate_exercises(llm, req)


@v1.post("/tutor/hint")
async def tutor_hint(req: HintRequest, llm: LLMDep) -> HintResponse:
    return await service.hint(llm, req)


@v1.post("/tutor/reply")
async def tutor_reply(req: TutorRequest, llm: LLMDep) -> TutorReply:
    return await service.tutor_reply(llm, req)


@v1.post("/explanations/evaluate")
async def explanations_evaluate(req: ExplanationRequest, llm: LLMDep) -> ExplanationEvaluation:
    return await service.evaluate_explanation(llm, req)


@v1.post("/mastery/calculate")
def mastery_calculate(req: MasteryRequest) -> MasteryResult:
    return mastery.calculate(req)


@v1.post("/revisions/schedule")
def revisions_schedule(
    req: RevisionRequest, scheduler: Annotated[Scheduler, Depends(get_scheduler)]
) -> RevisionSchedule:
    return scheduler.schedule(req)


@v1.post("/recommendations/next")
def recommendations_next(req: RecommendationRequest) -> Recommendation:
    return recommender.recommend(req)


app.include_router(v1)
