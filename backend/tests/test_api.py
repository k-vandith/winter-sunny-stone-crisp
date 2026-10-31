"""API contract: train in the background, then rescore without a second fit."""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from backend.main import app


def test_health_datasets_and_bench_roundtrip():
    client = TestClient(app)
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True
    datasets = client.get("/api/datasets")
    assert datasets.status_code == 200
    ids = [item["id"] for item in datasets.json()]
    assert ids == ["nsl-kdd", "cicids2017", "unsw-nb15"]
    rejected = client.post(
        "/api/bench/train",
        json={"dataset": "nsl-kdd", "seed": 2, "limit": 120, "attack": "pgd", "epsilon": 0.9, "steps": 3},
    )
    assert rejected.status_code == 422

    started = client.post(
        "/api/bench/train",
        json={"dataset": "nsl-kdd", "seed": 2, "limit": 180, "attack": "pgd", "epsilon": 0.1, "steps": 3},
    )
    assert started.status_code == 200
    run_id = started.json()["run_id"]
    body = None
    for _ in range(120):
        status = client.get(f"/api/bench/results/{run_id}")
        assert status.status_code == 200
        body = status.json()
        if body["phase"] in {"ready", "error"}:
            break
        time.sleep(0.5)
    assert body is not None
    assert body["phase"] == "ready", body.get("error")
    result = body["result"]
    assert len(result["scores"]) == 7
    assert [row["id"] for row in result["scores"]] == ["rf", "svm", "dnn", "dnn-sq", "at", "ensemble", "hybrid"]
    assert result["curve"] is not None and len(result["curve"]) == 7
    assert result["curve"][0]["epsilon"] == 0
    assert len(result["flows"]) > 0
    clean = result["scores"][2]["clean"]["f1"]
    assert 0 <= clean <= 1

    rescored = client.post(
        "/api/bench/rescore",
        json={"run_id": run_id, "attack": "fgsm", "epsilon": 0.2, "steps": 3, "full": True},
    )
    assert rescored.status_code == 200
    payload = rescored.json()
    assert payload["curve"][0]["f1"]["dnn"] >= 0
    assert payload["scores"][2]["adv"]["fn"] >= 0
    missing = client.post(
        "/api/bench/rescore",
        json={"run_id": "missing", "attack": "pgd", "epsilon": 0.1, "steps": 2, "full": False},
    )
    assert missing.status_code == 404
