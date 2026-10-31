"""Linear support-vector machine with train-only scaling."""

from __future__ import annotations

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from backend.evaluation.metrics import best_threshold


def _stable_scaler(x: np.ndarray) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(x)
    scaler.scale_ = np.where(scaler.scale_ < 1e-6, 1.0, scaler.scale_)
    return scaler


def train_svm(x: np.ndarray, y: np.ndarray, seed: int) -> tuple[SVC, StandardScaler, float]:
    scaler = _stable_scaler(x)
    xs = scaler.transform(x)
    model = SVC(kernel="linear", C=1.0, random_state=seed)
    model.fit(xs, y.astype(int))
    scores = model.decision_function(xs)
    return model, scaler, float(best_threshold(scores, y))


def predict_svm(model: SVC, scaler: StandardScaler, threshold: float, x: np.ndarray) -> np.ndarray:
    scores = model.decision_function(scaler.transform(x))
    return (scores >= threshold).astype(np.int64)
