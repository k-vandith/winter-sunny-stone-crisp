"""In-memory experiment state. Models stay here so epsilon changes do not retrain."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from backend.defenses.input_sanitization import Sanitizer
from backend.models.dnn import TrafficNet


@dataclass
class RunState:
    run_id: str
    dataset_id: str
    kind: str
    seed: int
    limit: int
    feature_names: list[str]
    train_n: int
    test_n: int
    normal_test: int
    attack_test: int
    trained_ms: float
    x_test: np.ndarray
    y_test: np.ndarray
    families: np.ndarray
    rf: RandomForestClassifier
    rf_threshold: float
    svm: SVC
    svm_scaler: StandardScaler
    svm_threshold: float
    dnn: TrafficNet
    dnn_threshold: float
    at: TrafficNet
    at_threshold: float
    rf_robust: RandomForestClassifier
    rf_robust_threshold: float
    svm_robust: SVC
    svm_robust_scaler: StandardScaler
    svm_robust_threshold: float
    sanitizer: Sanitizer
