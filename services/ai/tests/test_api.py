from fastapi.testclient import TestClient

from .conftest import SECRET

ROADMAP_REQ = {
    "goal": "Become an AI Engineer",
    "level": "beginner",
    "priorKnowledge": "Python basics",
    "dailyMinutes": 120,
    "targetMonths": 6,
    "struggle": "inconsistency",
}


def test_health_is_public(client: TestClient) -> None:
    assert client.get("/healthz").json()["status"] == "ok"


def test_v1_requires_shared_secret(client: TestClient) -> None:
    assert client.post("/v1/roadmaps/generate", json=ROADMAP_REQ).status_code == 401
    assert (
        client.post(
            "/v1/roadmaps/generate", json=ROADMAP_REQ, headers={"x-internal-secret": "nope"}
        ).status_code
        == 401
    )


def test_roadmap_generation_returns_camel_case(client: TestClient) -> None:
    res = client.post("/v1/roadmaps/generate", json=ROADMAP_REQ, headers=SECRET)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["promptVersion"]
    concept = body["roadmap"]["modules"][0]["concepts"][0]
    assert {"estMinutes", "taskTemplates", "criteria"} <= concept.keys()
    assert concept["criteria"]["quizPassPct"] == 70


def test_invalid_request_is_422(client: TestClient) -> None:
    bad = {**ROADMAP_REQ, "level": "wizard"}
    assert client.post("/v1/roadmaps/generate", json=bad, headers=SECRET).status_code == 422


CONCEPT = {
    "key": "functions",
    "title": "Functions",
    "summary": "Reusable blocks of code",
    "subtopics": [{"key": "params", "title": "Parameters"}, {"key": "returns", "title": "Return values"}],
}
LEARNER = {
    "goal": "AI",
    "level": "beginner",
    "currentConcept": "Functions",
    "weakAreas": [],
    "recentMistakes": [],
}


def test_quiz_and_exercise_generation(client: TestClient) -> None:
    q = client.post(
        "/v1/assessments/generate", json={"concept": CONCEPT, "level": "beginner", "count": 6}, headers=SECRET
    )
    assert q.status_code == 200 and len(q.json()["questions"]) == 6
    e = client.post(
        "/v1/exercises/generate",
        json={"concept": CONCEPT, "level": "beginner", "count": 2, "includeProject": True},
        headers=SECRET,
    )
    assert e.status_code == 200, e.text
    exercises = e.json()["exercises"]
    assert len(exercises) == 3 and exercises[-1]["isProject"] is True


def test_hint_level_three_reveals_answer(client: TestClient) -> None:
    body = {
        "learner": LEARNER,
        "exercise": {"title": "t", "prompt": "p", "starterCode": "x", "solution": "y"},
        "level": 3,
    }
    res = client.post("/v1/tutor/hint", json=body, headers=SECRET).json()
    assert res["revealsAnswer"] is True and res["level"] == 3
    body["level"] = 1
    assert client.post("/v1/tutor/hint", json=body, headers=SECRET).json()["revealsAnswer"] is False


def test_explanation_score_is_weighted_rubric(client: TestClient) -> None:
    text = " ".join(["word"] * 30)
    res = client.post(
        "/v1/explanations/evaluate",
        json={"concept": CONCEPT, "level": "beginner", "text": text},
        headers=SECRET,
    ).json()
    r = res["rubric"]
    assert abs(res["score"] - (0.5 * r["accuracy"] + 0.3 * r["completeness"] + 0.2 * r["ownWords"])) < 0.001


def test_mastery_endpoint(client: TestClient) -> None:
    body = {
        "now": "2026-11-08T12:00:00Z",
        "subtopicKeys": ["params"],
        "evidence": {"quiz": [{"at": "2026-11-08T11:00:00Z", "score": 0.8, "bySubtopic": {"params": 0.8}}]},
    }
    res = client.post("/v1/mastery/calculate", json=body, headers=SECRET).json()
    assert res["score"] == 32.0 and res["calcVersion"] == "rule-v1"
