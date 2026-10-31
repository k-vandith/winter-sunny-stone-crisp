"""Craft FGSM and PGD examples. Gradients come from the PyTorch network only."""

from __future__ import annotations

import logging

import numpy as np
import torch
from torch import nn

from backend.attacks.fgsm import fast_gradient_sign
from backend.attacks.pgd import projected_gradient_descent
from backend.defenses.input_sanitization import Sanitizer
from backend.models.dnn import TrafficNet

log = logging.getLogger(__name__)

_ART_CLASSIFIERS: dict[int, object] = {}


class _TwoClass(nn.Module):
    """Expose the intrusion logit as a 2-class score so ART can attack it."""

    def __init__(self, net: TrafficNet):
        super().__init__()
        self.net = net

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logit = self.net(x)
        return torch.stack((-logit, logit), dim=1)


def art_version() -> str:
    try:
        import art

        return str(art.__version__)
    except Exception:
        return ""


def _art_classifier(model: TrafficNet):
    cached = _ART_CLASSIFIERS.get(id(model))
    if cached is not None:
        return cached
    from art.estimators.classification import PyTorchClassifier

    device = next(model.parameters()).device
    wrapped = _TwoClass(model)
    classifier = PyTorchClassifier(
        model=wrapped,
        loss=nn.CrossEntropyLoss(),
        input_shape=(model.d_in,),
        nb_classes=2,
        optimizer=torch.optim.Adam(wrapped.parameters(), lr=1e-3),
        clip_values=(0.0, 1.0),
        preprocessing=(0.0, 1.0),
        device_type="gpu" if device.type == "cuda" else "cpu",
    )
    _ART_CLASSIFIERS[id(model)] = classifier
    return classifier


def _project(original: np.ndarray, candidate: np.ndarray, eps: float) -> np.ndarray:
    delta = np.clip(candidate - original, -eps, eps)
    return np.clip(original + delta, 0.0, 1.0)


def _art_generate(model: TrafficNet, rows: np.ndarray, kind: str, eps: float, steps: int, seed: int) -> np.ndarray:
    from art.attacks.evasion import FastGradientMethod, ProjectedGradientDescent

    np.random.seed(seed)
    torch.manual_seed(seed)
    classifier = _art_classifier(model)
    labels = np.ones(len(rows), dtype=np.int64)
    matrix = np.asarray(rows, dtype=np.float32)
    if kind == "fgsm":
        attack = FastGradientMethod(
            estimator=classifier,
            norm=np.inf,
            eps=float(eps),
            eps_step=float(eps),
            targeted=False,
            num_random_init=0,
            batch_size=256,
        )
    else:
        steps = max(1, int(steps))
        eps_step = float(min(eps, max(eps / steps * 2.0, eps / 10.0)))
        attack = ProjectedGradientDescent(
            estimator=classifier,
            norm=np.inf,
            eps=float(eps),
            eps_step=eps_step,
            max_iter=steps,
            targeted=False,
            num_random_init=1,
            batch_size=256,
            verbose=False,
        )
    generated = attack.generate(x=matrix, y=labels)
    return _project(rows.astype(np.float64), np.asarray(generated, dtype=np.float64), eps)


def craft_attack(
    model: TrafficNet,
    x: np.ndarray,
    y: np.ndarray,
    kind: str,
    eps: float,
    steps: int,
    sanitizer: Sanitizer | None = None,
    seed: int = 0,
) -> np.ndarray:
    """Perturb intrusion rows only. Benign flows are copied.

    Forest and SVM never supply a gradient. Their scores are transfer scores
    on examples built from `model`, which is always a PyTorch network.
    Squeeze-aware attacks use a straight-through estimator and stay native,
    because that defense is fit on this bench's training quantiles.
    """
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y).astype(int)
    out = x.copy()
    if eps <= 0:
        return out
    intrusion = np.flatnonzero(y == 1)
    if intrusion.size == 0:
        return out
    rows = x[intrusion]
    use_art = sanitizer is None and bool(art_version())
    if use_art:
        try:
            out[intrusion] = _art_generate(model, rows, kind, eps, steps, seed)
            return out
        except Exception:
            log.warning("ART %s failed; using the native signed-gradient attack", kind, exc_info=True)
    if kind == "fgsm":
        attacked = fast_gradient_sign(model, rows, eps, sanitizer=sanitizer, seed=seed)
    else:
        attacked = projected_gradient_descent(
            model,
            rows,
            eps=eps,
            steps=steps,
            sanitizer=sanitizer,
            seed=seed,
            random_start=True,
        )
    out[intrusion] = _project(rows, attacked, eps)
    return out
