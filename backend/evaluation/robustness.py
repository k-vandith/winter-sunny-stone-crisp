"""AdversarialShield Robustness Score (ASRS)."""

from __future__ import annotations

from backend.config import ASRS_EPS, ASRS_WEIGHTS


def asrs(clean_f1: float, f1_at_eps: list[float]) -> float:
    """Weighted retention of clean F1. Stronger attacks carry more weight.

    ASRS = 0.10·r(0.05) + 0.20·r(0.10) + 0.30·r(0.20) + 0.40·r(0.30)
    r(ε) = min(1, F1(ε) / clean F1). A zero clean F1 is treated as a tiny base
    so the ratio stays defined and still caps at 1.
    """
    base = max(float(clean_f1), 1e-6)
    score = 0.0
    for weight, f1 in zip(ASRS_WEIGHTS, f1_at_eps):
        ratio = min(1.0, float(f1) / base)
        score += weight * ratio
    return score


def asrs_from_curve(clean_f1: float, curve: list[dict], model_id: str) -> float:
    by_eps: dict[float, float] = {}
    for point in curve:
        by_eps[round(float(point["epsilon"]), 2)] = float(point["f1"][model_id])
    values = [by_eps.get(round(eps, 2), 0.0) for eps in ASRS_EPS]
    return asrs(clean_f1, values)
