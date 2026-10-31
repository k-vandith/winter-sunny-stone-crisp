"""Fast Gradient Sign Method.

The update is the Goodfellow / CleverHans rule
x_adv = x + ε · sign(∇_x loss(x, y)), then clipped to the L∞ ball and to [0, 1].
Non-adaptive calls go through ART's FastGradientMethod when that toolbox imports.
"""

from __future__ import annotations

import numpy as np

from backend.attacks.pgd import projected_gradient_descent
from backend.defenses.input_sanitization import Sanitizer
from backend.models.dnn import TrafficNet


def fast_gradient_sign(
    model: TrafficNet,
    x: np.ndarray,
    eps: float,
    sanitizer: Sanitizer | None = None,
    seed: int = 0,
) -> np.ndarray:
    return projected_gradient_descent(
        model,
        x,
        eps=eps,
        steps=1,
        sanitizer=sanitizer,
        seed=seed,
        random_start=False,
    )
