"""REST API used by the existing AdversarialShield dashboard."""

from __future__ import annotations

import logging
import threading
import uuid

from fastapi import APIRouter, HTTPException

from backend.api.schemas import (
    BenchResultModel,
    DatasetModel,
    JobModel,
    RescoreModel,
    RescoreRequest,
    TrainRequest,
)
from backend.attacks.attack_pipeline import art_version
from backend.datasets.loader import dataset_catalog
from backend.services.evaluation_service import score_run
from backend.services.state import RunState
from backend.services.training_service import train_run

log = logging.getLogger(__name__)
router = APIRouter()

_LOCK = threading.Lock()
_JOBS: dict[str, dict] = {}
_RUNS: dict[str, RunState] = {}
_ORDER: list[str] = []


def _pack_result(state: RunState, attack: str, epsilon: float, steps: int, scored: dict) -> dict:
    return {
        "run_id": state.run_id,
        "dataset": state.dataset_id,
        "dataset_kind": state.kind,
        "seed": state.seed,
        "limit": state.limit,
        "attack": attack,
        "epsilon": epsilon,
        "steps": 1 if attack == "fgsm" else steps,
        "trainN": state.train_n,
        "testN": state.test_n,
        "ms": state.trained_ms,
        "attacks": state.attack_test,
        "benign": state.normal_test,
        "scores": scored["scores"],
        "curve": scored["curve"],
        "flows": scored["flows"],
    }


def _train_job(run_id: str, request: TrainRequest) -> None:
    def progress(message: str) -> None:
        with _LOCK:
            job = _JOBS.get(run_id)
            if job is not None:
                job["progress"] = message

    try:
        state = train_run(request.dataset, request.seed, request.limit, run_id, progress)
        scored = score_run(state, request.attack, request.epsilon, request.steps, True, True)
        result = BenchResultModel.model_validate(_pack_result(state, request.attack, request.epsilon, request.steps, scored))
        with _LOCK:
            _RUNS[run_id] = state
            _ORDER.append(run_id)
            while len(_ORDER) > 4:
                old = _ORDER.pop(0)
                _RUNS.pop(old, None)
            _JOBS[run_id]["phase"] = "ready"
            _JOBS[run_id]["progress"] = "Bench is live. Move epsilon — scores update without retraining."
            _JOBS[run_id]["result"] = result
    except Exception as exc:
        log.exception("training failed")
        with _LOCK:
            job = _JOBS.get(run_id)
            if job is not None:
                job["phase"] = "error"
                job["error"] = str(exc)
                job["progress"] = "The bench failed to fit."


@router.get("/health")
def health() -> dict:
    import torch

    return {
        "ok": True,
        "torch": torch.__version__,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "art": art_version() or None,
    }


@router.get("/datasets", response_model=list[DatasetModel])
def datasets() -> list[dict]:
    return dataset_catalog()


@router.post("/bench/train")
def start_training(request: TrainRequest) -> dict:
    run_id = uuid.uuid4().hex[:12]
    with _LOCK:
        _JOBS[run_id] = {
            "run_id": run_id,
            "phase": "running",
            "progress": "Queued",
            "error": "",
            "result": None,
        }
    threading.Thread(target=_train_job, args=(run_id, request), daemon=True).start()
    return {"run_id": run_id}


@router.get("/bench/results/{run_id}", response_model=JobModel)
def results(run_id: str) -> dict:
    with _LOCK:
        job = _JOBS.get(run_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Unknown run.")
        return {
            "run_id": run_id,
            "phase": job["phase"],
            "progress": job["progress"],
            "error": job["error"],
            "result": job["result"],
        }


@router.post("/bench/rescore", response_model=RescoreModel)
def rescore(request: RescoreRequest) -> dict:
    with _LOCK:
        state = _RUNS.get(request.run_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Unknown run. Train the bench first.")
    try:
        scored = score_run(
            state,
            request.attack,
            request.epsilon,
            request.steps,
            with_asrs=request.full,
            with_curve=request.full,
        )
    except Exception as exc:
        log.exception("rescore failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"scores": scored["scores"], "flows": scored["flows"], "curve": scored["curve"]}
