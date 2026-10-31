"""Score clean traffic, transferred attacks, and the defended models on one split."""

from __future__ import annotations

import time

import numpy as np

from backend.attacks.attack_pipeline import craft_attack
from backend.config import CURVE_EPS
from backend.defenses.hybrid_defense import predict_hybrid, predict_squeeze
from backend.evaluation.latency import detection_latency_ms
from backend.evaluation.metrics import attack_success, confusion
from backend.evaluation.robustness import asrs_from_curve
from backend.models.dnn import predict_dnn
from backend.models.ensemble import majority_vote
from backend.models.random_forest import predict_forest
from backend.models.svm import predict_svm
from backend.services.state import RunState

MODEL_SPECS = (
    ("rf", "Random forest", "Transfer from the network"),
    ("svm", "Linear SVM", "Transfer from the network"),
    ("dnn", "Deep network", "White-box logit FGSM / PGD"),
    ("dnn-sq", "Network + squeeze", "Adaptive straight-through"),
    ("at", "Adversarial training", "White-box on the robust net"),
    ("ensemble", "Ensemble vote", "Transfer from the network"),
    ("hybrid", "Hybrid shield", "Adaptive attack on the defended committee"),
)

VARIANTS = {
    "rf": "transfer",
    "svm": "transfer",
    "dnn": "transfer",
    "ensemble": "transfer",
    "dnn-sq": "squeeze",
    "at": "robust",
    "hybrid": "hybrid",
}

FAMILIES = ("normal", "dos", "probe", "r2l", "u2r")


def predict_model(state: RunState, model_id: str, rows: np.ndarray) -> np.ndarray:
    if model_id == "rf":
        return predict_forest(state.rf, state.rf_threshold, rows)
    if model_id == "svm":
        return predict_svm(state.svm, state.svm_scaler, state.svm_threshold, rows)
    if model_id == "dnn":
        return predict_dnn(state.dnn, state.dnn_threshold, rows)
    if model_id == "dnn-sq":
        return predict_squeeze(state, rows)
    if model_id == "at":
        return predict_dnn(state.at, state.at_threshold, rows)
    if model_id == "ensemble":
        return majority_vote(
            predict_forest(state.rf, state.rf_threshold, rows),
            predict_svm(state.svm, state.svm_scaler, state.svm_threshold, rows),
            predict_dnn(state.dnn, state.dnn_threshold, rows),
        )
    if model_id == "hybrid":
        return predict_hybrid(state, rows)
    raise KeyError(model_id)


def _attack_seed(state: RunState, variant: str, kind: str, eps: float, steps: int) -> int:
    variant_offset = {"transfer": 11, "squeeze": 29, "robust": 47, "hybrid": 71}[variant]
    kind_offset = 3 if kind == "fgsm" else 9
    return int(state.seed + variant_offset + kind_offset * 100 + round(eps * 1000) + steps)


def adversarial_rows(
    state: RunState,
    variant: str,
    kind: str,
    eps: float,
    steps: int,
) -> np.ndarray:
    if eps <= 0:
        return state.x_test.copy()
    seed = _attack_seed(state, variant, kind, eps, steps)
    if variant == "transfer":
        return craft_attack(state.dnn, state.x_test, state.y_test, kind, eps, steps, None, seed)
    if variant == "squeeze":
        return craft_attack(state.dnn, state.x_test, state.y_test, kind, eps, steps, state.sanitizer, seed)
    if variant == "robust":
        return craft_attack(state.at, state.x_test, state.y_test, kind, eps, steps, None, seed)
    if variant == "hybrid":
        return craft_attack(state.at, state.x_test, state.y_test, kind, eps, steps, state.sanitizer, seed)
    raise KeyError(variant)


def _family_stats(state: RunState, clean: np.ndarray, adv: np.ndarray) -> list[dict]:
    stats = []
    for family in FAMILIES:
        idx = np.flatnonzero(state.families == family)
        if idx.size == 0:
            continue
        stats.append(
            {
                "family": family,
                "support": int(idx.size),
                "clean": float(np.mean(clean[idx] == 1)),
                "adv": float(np.mean(adv[idx] == 1)),
            }
        )
    return stats


def _json_confusion(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    raw = confusion(y_true, y_pred)
    out = {}
    for key, value in raw.items():
        out[key] = int(value) if key in {"tp", "tn", "fp", "fn"} else float(value)
    return out


def _flows(state: RunState, kind: str, eps: float, steps: int, cache: dict) -> list[dict]:
    clean = predict_model(state, "dnn", state.x_test)
    dnn_rows = cache[("transfer", round(float(eps), 4))]
    adv = predict_model(state, "dnn", dnn_rows)
    hybrid_rows = cache[("hybrid", round(float(eps), 4))]
    hybrid = predict_model(state, "hybrid", hybrid_rows)
    ranked = []
    for index in np.flatnonzero(state.y_test == 1):
        delta = dnn_rows[index] - state.x_test[index]
        feature_index = int(np.argmax(np.abs(delta))) if delta.size else 0
        change = float(delta[feature_index]) if delta.size else 0.0
        flipped = bool(clean[index] == 1 and adv[index] == 0)
        ranked.append((flipped, abs(change), int(index), feature_index, change))
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    flows = []
    for flipped, _magnitude, index, feature_index, change in ranked[:8]:
        feature = state.feature_names[feature_index] if feature_index < len(state.feature_names) else "feature"
        flows.append(
            {
                "id": index,
                "family": str(state.families[index]),
                "y": 1,
                "clean": int(clean[index]),
                "adv": int(adv[index]),
                "hybrid": int(hybrid[index]),
                "maxDelta": abs(change),
                "feature": feature,
                "delta": change,
            }
        )
    return flows


def evaluate_state(
    state: RunState,
    attack: str,
    epsilon: float,
    steps: int,
    with_asrs: bool,
    with_curve: bool,
) -> dict:
    steps = 1 if attack == "fgsm" else int(steps)
    epsilon = float(epsilon)
    cache: dict[tuple[str, float], np.ndarray] = {}

    def rows_for(model_id: str, eps: float) -> np.ndarray:
        key = (VARIANTS[model_id], round(float(eps), 4))
        if key not in cache:
            cache[key] = adversarial_rows(state, VARIANTS[model_id], attack, eps, steps)
        return cache[key]

    curve = None
    if with_curve or with_asrs:
        curve = []
        for eps in CURVE_EPS:
            f1: dict[str, float] = {}
            for model_id, _name, _note in MODEL_SPECS:
                matrix = state.x_test if eps == 0 else rows_for(model_id, eps)
                f1[model_id] = float(confusion(state.y_test, predict_model(state, model_id, matrix))["f1"])
            curve.append({"epsilon": float(eps), "f1": f1})

    # The flow table always needs the network transfer attack and the hybrid attack.
    rows_for("dnn", epsilon)
    rows_for("hybrid", epsilon)

    scores = []
    for model_id, name, note in MODEL_SPECS:
        clean_pred = predict_model(state, model_id, state.x_test)
        attacked = state.x_test if epsilon == 0 else rows_for(model_id, epsilon)
        started = time.perf_counter()
        adv_pred = predict_model(state, model_id, attacked)
        latency = ((time.perf_counter() - started) * 1000.0) / max(1, state.test_n)
        clean_metrics = _json_confusion(state.y_test, clean_pred)
        adv_metrics = _json_confusion(state.y_test, adv_pred)
        robust = asrs_from_curve(clean_metrics["f1"], curve, model_id) if with_asrs and curve is not None else 0.0
        scores.append(
            {
                "id": model_id,
                "name": name,
                "attack": note,
                "clean": clean_metrics,
                "adv": adv_metrics,
                "asr": float(attack_success(state.y_test, clean_pred, adv_pred)),
                "asrs": float(robust),
                "latencyMs": float(latency),
                "families": _family_stats(state, clean_pred, adv_pred),
            }
        )
    # latency helper is available for tests; the timed predict above is the reported figure.
    _ = detection_latency_ms
    return {
        "scores": scores,
        "curve": curve if with_curve else None,
        "flows": _flows(state, attack, epsilon, steps, cache),
    }
