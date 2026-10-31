"""Hybrid defense: squeeze, then the robust network or an agreeing forest+SVM pair."""

from __future__ import annotations

import numpy as np

from backend.defenses.input_sanitization import Sanitizer, sanitize
from backend.models.dnn import TrafficNet, predict_dnn
from backend.models.random_forest import predict_forest
from backend.models.svm import predict_svm


def hybrid_rule(robust: np.ndarray, forest: np.ndarray, linear: np.ndarray) -> np.ndarray:
    robust = np.asarray(robust).astype(int)
    forest = np.asarray(forest).astype(int)
    linear = np.asarray(linear).astype(int)
    alert = (robust == 1) | ((forest == 1) & (linear == 1))
    return alert.astype(np.int64)


def predict_hybrid(state: object, rows: np.ndarray) -> np.ndarray:
    squeezed = sanitize(rows, state.sanitizer)
    robust = predict_dnn(state.at, state.at_threshold, squeezed)
    forest = predict_forest(state.rf_robust, state.rf_robust_threshold, squeezed)
    linear = predict_svm(state.svm_robust, state.svm_robust_scaler, state.svm_robust_threshold, squeezed)
    return hybrid_rule(robust, forest, linear)


def predict_squeeze(state: object, rows: np.ndarray) -> np.ndarray:
    return predict_dnn(state.dnn, state.dnn_threshold, sanitize(rows, state.sanitizer))
