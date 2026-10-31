"""Request and response models for the bench API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DatasetId = Literal["nsl-kdd", "cicids2017", "unsw-nb15"]
AttackKind = Literal["fgsm", "pgd"]


class TrainRequest(BaseModel):
    dataset: DatasetId = "nsl-kdd"
    seed: int = Field(default=10, ge=0, le=1_000_000)
    limit: int = Field(default=1400, ge=40, le=20000)
    attack: AttackKind = "pgd"
    epsilon: float = Field(default=0.1, ge=0.0, le=0.30)
    steps: int = Field(default=7, ge=1, le=10)


class RescoreRequest(BaseModel):
    run_id: str
    attack: AttackKind
    epsilon: float = Field(ge=0.0, le=0.30)
    steps: int = Field(ge=1, le=10)
    full: bool = False


class ConfusionModel(BaseModel):
    tp: int
    tn: int
    fp: int
    fn: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    fpr: float
    fnr: float


class FamilyStatModel(BaseModel):
    family: str
    support: int
    clean: float
    adv: float


class ModelScoreModel(BaseModel):
    id: str
    name: str
    attack: str
    clean: ConfusionModel
    adv: ConfusionModel
    asr: float
    asrs: float
    latencyMs: float
    families: list[FamilyStatModel]


class SweepPointModel(BaseModel):
    epsilon: float
    f1: dict[str, float]


class FlowModel(BaseModel):
    id: int
    family: str
    y: int
    clean: int
    adv: int
    hybrid: int
    maxDelta: float
    feature: str
    delta: float


class BenchResultModel(BaseModel):
    run_id: str
    dataset: str
    dataset_kind: str
    seed: int
    limit: int
    attack: str
    epsilon: float
    steps: int
    trainN: int
    testN: int
    ms: float
    attacks: int
    benign: int
    scores: list[ModelScoreModel]
    curve: list[SweepPointModel] | None = None
    flows: list[FlowModel]


class JobModel(BaseModel):
    run_id: str
    phase: Literal["running", "ready", "error"]
    progress: str
    error: str = ""
    result: BenchResultModel | None = None


class RescoreModel(BaseModel):
    scores: list[ModelScoreModel]
    flows: list[FlowModel]
    curve: list[SweepPointModel] | None = None


class DatasetModel(BaseModel):
    id: str
    name: str
    kind: str
    origin: str
    summary: str
    features: list[str]
