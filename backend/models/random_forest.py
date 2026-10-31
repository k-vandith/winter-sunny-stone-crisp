"""Random forest baseline."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from backend.config import RF_DEPTH, RF_TREES
from backend.evaluation.metrics import best_threshold


def train_random_forest(
    x: np.ndarray,
    y: np.ndarray,
    seed: int,
    trees: int = RF_TREES,
    depth: int = RF_DEPTH,
) -> tuple[RandomForestClassifier, float]:
    model = RandomForestClassifier(
        n_estimators=trees,
        max_depth=depth,
        min_samples_leaf=2,
        random_state=seed,
        n_jobs=1,
    )
    model.fit(x, y.astype(int))
    scores = model.predict_proba(x)[:, 1]
    return model, float(best_threshold(scores, y))


def predict_forest(model: RandomForestClassifier, threshold: float, x: np.ndarray) -> np.ndarray:
    scores = model.predict_proba(x)[:, 1]
    return (scores >= threshold).astype(np.int64)
