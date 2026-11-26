"""Request/response models. JSON is camelCase on the wire; mirrored by packages/shared/src/ai.ts."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Slug = Annotated[str, Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=60)]
Unit = Annotated[float, Field(ge=0, le=1)]
Level = Literal["beginner", "intermediate", "advanced"]
Struggle = Literal["inconsistency", "what_next", "jumping", "theory_to_projects"]
ConceptStatus = Literal["mastered", "in_progress", "up_next", "locked"]


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


# ---------- Roadmap ----------


class Subtopic(Camel):
    key: Slug
    title: str = Field(min_length=2, max_length=100)


class Criteria(Camel):
    quiz_pass_pct: int = Field(ge=50, le=100)
    exercises_required: int = Field(ge=1, le=5)
    explanation_required: bool


class TaskTemplate(Camel):
    kind: Literal["learn", "explain", "coding", "mini_project", "assessment"]
    title: str = Field(min_length=3, max_length=140)
    minutes: int = Field(ge=5, le=180)


class Concept(Camel):
    key: Slug
    title: str = Field(min_length=2, max_length=100)
    summary: str = Field(min_length=5, max_length=400)
    est_minutes: int = Field(ge=15, le=1200)
    prerequisites: list[Slug]
    subtopics: list[Subtopic] = Field(min_length=2, max_length=8)
    criteria: Criteria
    task_templates: list[TaskTemplate] = Field(min_length=3, max_length=6)


class Module(Camel):
    key: Slug
    title: str = Field(min_length=2, max_length=100)
    milestone: str = Field(min_length=5, max_length=200)
    est_weeks: int = Field(ge=1, le=12)
    concepts: list[Concept] = Field(min_length=1, max_length=8)


class RoadmapDraft(Camel):
    title: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=5, max_length=600)
    modules: list[Module] = Field(min_length=1, max_length=10)


class RoadmapRequest(Camel):
    goal: str = Field(min_length=3, max_length=120)
    level: Level
    prior_knowledge: str = Field(default="", max_length=300)
    daily_minutes: int = Field(ge=15, le=480)
    target_months: int = Field(ge=1, le=24)
    struggle: Struggle


class RoadmapResponse(Camel):
    roadmap: RoadmapDraft
    model: str
    prompt_version: str


# ---------- Shared context ----------


class ConceptContext(Camel):
    key: str
    title: str
    summary: str
    subtopics: list[Subtopic]


class LearnerContext(Camel):
    goal: str
    level: str
    current_concept: str
    weak_areas: list[str]
    recent_mistakes: list[str]


# ---------- Assessments ----------


class Question(Camel):
    subtopic_key: Slug
    prompt: str = Field(min_length=5)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    rationale: str = Field(min_length=5)


class Assessment(Camel):
    questions: list[Question] = Field(min_length=3, max_length=20)


class AssessmentRequest(Camel):
    concept: ConceptContext
    level: str
    weak_subtopic_keys: list[str] = []
    count: int = Field(ge=3, le=20)


# ---------- Exercises ----------


class ExerciseTest(Camel):
    name: str = Field(min_length=1, max_length=80)
    call: str = Field(min_length=1, max_length=400)
    expected: str = Field(min_length=1, max_length=400)


class Exercise(Camel):
    subtopic_key: Slug
    title: str = Field(min_length=3, max_length=100)
    prompt: str = Field(min_length=10)
    starter_code: str = Field(min_length=1)
    tests: list[ExerciseTest] = Field(min_length=1, max_length=8)
    solution: str = Field(min_length=1)
    is_project: bool


class Exercises(Camel):
    exercises: list[Exercise] = Field(min_length=1, max_length=6)


class ExerciseRequest(Camel):
    concept: ConceptContext
    level: str
    count: int = Field(ge=1, le=5)
    include_project: bool
    recent_mistakes: list[str] = []


# ---------- Tutor ----------


class HintExercise(Camel):
    title: str
    prompt: str
    starter_code: str
    solution: str


class HintRequest(Camel):
    learner: LearnerContext
    exercise: HintExercise
    level: int = Field(ge=1, le=3)
    previous_hints: list[str] = []
    current_code: str = ""
    last_error: str | None = None


class HintDraft(Camel):
    hint: str = Field(min_length=1, max_length=1200)


class HintResponse(Camel):
    level: int
    hint: str
    reveals_answer: bool


class TextBlock(Camel):
    type: Literal["text"]
    text: str


class CodeBlock(Camel):
    type: Literal["code"]
    code: str
    language: str


class TutorReply(Camel):
    blocks: list[TextBlock | CodeBlock] = Field(min_length=1)
    followups: list[str] = Field(max_length=3)


class HistoryItem(Camel):
    role: Literal["user", "assistant"]
    text: str


class TutorExercise(Camel):
    title: str
    prompt: str


class TutorRequest(Camel):
    learner: LearnerContext
    concept: ConceptContext
    exercise: TutorExercise | None = None
    history: list[HistoryItem] = []
    message: str = Field(min_length=1, max_length=2000)
    mode: Literal["free", "simpler", "example", "quiz"] = "free"


# ---------- Explanations ----------


class Rubric(Camel):
    accuracy: Unit
    completeness: Unit
    own_words: Unit


class ExplanationDraft(Camel):
    rubric: Rubric
    feedback: str
    misconceptions: list[str]


class ExplanationEvaluation(ExplanationDraft):
    score: Unit


class ExplanationRequest(Camel):
    concept: ConceptContext
    level: str
    text: str = Field(min_length=1, max_length=4000)


# ---------- Mastery ----------


class QuizEvidence(Camel):
    at: datetime
    score: Unit
    by_subtopic: dict[str, Unit] = {}


class ExerciseEvidence(Camel):
    at: datetime
    subtopic_key: str | None
    solved_without_final_hint: bool


class ExplanationEvidence(Camel):
    at: datetime
    score: Unit


class Evidence(Camel):
    quiz: list[QuizEvidence] = []
    exercises: list[ExerciseEvidence] = []
    explanations: list[ExplanationEvidence] = []


class MasteryRequest(Camel):
    now: datetime
    pass_mark: int = Field(default=70, ge=1, le=100)
    exercises_required: int = Field(default=3, ge=1, le=10)
    subtopic_keys: list[str] = []
    evidence: Evidence


class Components(Camel):
    quiz: Unit
    practical: Unit
    explanation: Unit


class Counts(Camel):
    quiz: int
    exercises: int
    explanations: int


class SubtopicMastery(Camel):
    subtopic_key: str
    score: float
    passed: bool


class MasteryResult(Camel):
    score: float = Field(ge=0, le=100)
    passed: bool
    components: Components
    counts: Counts
    per_subtopic: list[SubtopicMastery]
    calc_version: str


# ---------- Revisions ----------


class WeakSubtopic(Camel):
    key: str
    title: str


class RevisionRequest(Camel):
    now: datetime
    learned_at: datetime
    concept_title: str
    mastery_score: float
    pass_mark: int = 70
    weak_subtopics: list[WeakSubtopic] = []


class RevisionItem(Camel):
    due_at: datetime
    interval_days: int
    kind: Literal["practice", "recall", "apply", "retention"]
    subtopic_key: str | None
    title: str
    reason: str
    minutes: int


class RevisionSchedule(Camel):
    items: list[RevisionItem]
    scheduler_version: str


# ---------- Recommendations ----------


class ConceptState(Camel):
    key: str
    title: str
    status: ConceptStatus
    mastery: float | None
    last_learned_at: datetime | None


class WeakPart(Camel):
    concept_key: str
    key: str
    title: str
    score: float


class DueRevision(Camel):
    id: str
    concept_key: str
    title: str
    due_at: datetime
    minutes: int
    kind: str


class RecommendationRequest(Camel):
    now: datetime
    pass_mark: int = 70
    focus_concept_key: str | None
    concepts: list[ConceptState] = Field(min_length=1)
    weak_subtopics: list[WeakPart] = []
    due_revisions: list[DueRevision] = []


class Recommendation(Camel):
    kind: Literal["learn", "practice", "revise", "advance"]
    concept_key: str
    title: str
    detail: str
    reason: str = Field(min_length=10)
    est_minutes: int = Field(ge=1)
    revision_id: str | None
