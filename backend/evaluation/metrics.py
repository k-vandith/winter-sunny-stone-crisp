"""Classification metrics used by the bench. Positive class is intrusion."""

from __future__ import annotations

import numpy as np


def confusion(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    total = max(1, int(y_true.size))
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    f1 = 0.0 if precision + recall == 0 else (2 * precision * recall) / (precision + recall)
    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": (tp + tn) / total,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "fpr": fp / max(1, fp + tn),
        "fnr": fn / max(1, fn + tp),
    }


def attack_success(y_true: np.ndarray, clean_pred: np.ndarray, adv_pred: np.ndarray) -> float:
    """Share of clean intrusion detections that the attack flips to benign."""
    y_true = np.asarray(y_true).astype(int)
    clean_pred = np.asarray(clean_pred).astype(int)
    adv_pred = np.asarray(adv_pred).astype(int)
    held = (y_true == 1) & (clean_pred == 1)
    n_held = int(np.sum(held))
    if n_held == 0:
        return 0.0
    flipped = int(np.sum(held & (adv_pred == 0)))
    return flipped / n_held


def best_threshold(scores: np.ndarray, y: np.ndarray) -> float:
    """Train-only F1 threshold. Works for probabilities and raw margins."""
    scores = np.asarray(scores, dtype=float)
    y = np.asarray(y).astype(int)
    if scores.size == 0:
        return 0.5
    order = np.argsort(scores)
    sorted_scores = scores[order]
    best_t = float(sorted_scores[len(sorted_scores) // 2])
    best_f1 = -1.0
    for step in range(25):
        idx = min(len(sorted_scores) - 1, int((step / 24) * (len(sorted_scores) - 1)))
        threshold = float(sorted_scores[idx])
        pred = (scores >= threshold).astype(int)
        f1 = confusion(y, pred)["f1"]
        if f1 > best_f1:
            best_f1 = f1
            best_t = threshold
    return best_t
