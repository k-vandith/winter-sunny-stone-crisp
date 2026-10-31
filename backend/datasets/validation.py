"""Checks applied after preprocessing and before any model sees the test split."""

from __future__ import annotations

import numpy as np


def validate_arrays(x: np.ndarray, y: np.ndarray, families: np.ndarray, name: str) -> None:
    if x.ndim != 2 or x.shape[0] == 0:
        raise ValueError(f"{name} has no feature rows.")
    if len(x) != len(y) or len(x) != len(families):
        raise ValueError(f"{name} labels and features are different lengths.")
    if not np.isfinite(x).all():
        raise ValueError(f"{name} still contains NaN or infinity.")
    labels = set(np.unique(y).tolist())
    if not labels.issubset({0, 1}):
        raise ValueError(f"{name} labels must be benign 0 or intrusion 1.")
    if x.shape[1] == 0:
        raise ValueError(f"{name} has no usable features.")


def assert_disjoint_ids(train_ids: np.ndarray, test_ids: np.ndarray) -> None:
    overlap = np.intersect1d(train_ids, test_ids)
    if overlap.size:
        raise ValueError("Train and test splits overlap.")
