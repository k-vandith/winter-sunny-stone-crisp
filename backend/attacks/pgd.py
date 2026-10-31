"""Projected gradient descent in the L∞ ball, including the one-step FGSM case."""

from __future__ import annotations

import numpy as np
import torch
from torch import nn

from backend.defenses.input_sanitization import Sanitizer, squeeze_ste
from backend.models.dnn import TrafficNet


def _forward(model: TrafficNet, x: torch.Tensor, sanitizer: Sanitizer | None) -> torch.Tensor:
    seen = squeeze_ste(x, sanitizer) if sanitizer is not None else x
    return model(seen)


def projected_gradient_descent(
    model: TrafficNet,
    x: np.ndarray,
    eps: float,
    steps: int,
    sanitizer: Sanitizer | None = None,
    seed: int = 0,
    random_start: bool = True,
) -> np.ndarray:
    """Iterative L∞ attack. Benign rows are left unchanged by the caller.

    x_adv starts inside the ε-ball, steps by sign(∇_x BCE), then projects:
    x_adv = clip(x_adv, x-ε, x+ε) and clip to [0, 1].
    """
    if len(x) == 0 or eps <= 0:
        return np.asarray(x, dtype=np.float64).copy()

    device = next(model.parameters()).device
    was_training = model.training
    model.eval()
    torch.manual_seed(seed)
    x0 = torch.as_tensor(np.asarray(x), dtype=torch.float32, device=device)
    steps = max(1, int(steps))
    alpha = float(eps) if not random_start and steps == 1 else float(min(eps, max(eps / steps * 2.0, eps / 10.0)))
    if random_start:
        noise = torch.empty_like(x0).uniform_(-float(eps), float(eps))
        adv = torch.max(torch.min(x0 + noise, x0 + eps), x0 - eps).clamp(0.0, 1.0)
    else:
        adv = x0.detach().clone()

    loss_fn = nn.BCEWithLogitsLoss()
    target = torch.ones(x0.shape[0], dtype=torch.float32, device=device)
    for _step in range(steps):
        adv = adv.detach().requires_grad_(True)
        with torch.enable_grad():
            loss = loss_fn(_forward(model, adv, sanitizer), target)
            grad = torch.autograd.grad(loss, adv)[0]
        adv = adv.detach() + alpha * grad.sign()
        adv = torch.max(torch.min(adv, x0 + eps), x0 - eps).clamp(0.0, 1.0)

    if was_training:
        model.train()
    else:
        model.eval()
    return adv.detach().cpu().numpy().astype(np.float64)
