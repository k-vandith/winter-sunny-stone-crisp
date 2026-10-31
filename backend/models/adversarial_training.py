"""Madry-style adversarial training of the intrusion network."""

from __future__ import annotations

import copy

import numpy as np
import torch
from torch import nn

from backend.attacks.pgd import projected_gradient_descent
from backend.models.dnn import TrafficNet, predict_scores, torch_device
from backend.evaluation.metrics import best_threshold


def train_adversarial(
    model: TrafficNet,
    x: np.ndarray,
    y: np.ndarray,
    seed: int,
    epochs: int = 5,
    eps: float = 0.15,
    steps: int = 4,
    lr: float = 0.02,
) -> tuple[TrafficNet, float]:
    """Continue from the clean network. Intrusion rows are replaced by PGD samples.

    The inner attack is native projected gradient descent so training does not
    depend on rebuilding an ART classifier every batch. Test-time attacks on
    this network still use the shared attack pipeline.
    """
    device = torch_device()
    robust = copy.deepcopy(model).to(device)
    opt = torch.optim.Adam(robust.parameters(), lr=lr)
    loss_fn = nn.BCEWithLogitsLoss()
    xt = torch.as_tensor(x, dtype=torch.float32, device=device)
    yt = torch.as_tensor(y, dtype=torch.float32, device=device)
    generator = torch.Generator()
    generator.manual_seed(seed + 17)
    batch = 64
    y_np = np.asarray(y).astype(int)
    for epoch in range(epochs):
        perm = torch.randperm(len(x), generator=generator)
        for start in range(0, len(x), batch):
            idx = perm[start : start + batch]
            xb = xt[idx].detach().clone()
            yb = yt[idx]
            y_batch = y_np[idx.numpy()]
            coins = torch.rand(len(idx), generator=generator).numpy()
            attack_mask = (y_batch == 1) & (coins < 0.75)
            if attack_mask.any():
                crafted = projected_gradient_descent(
                    robust,
                    xb.detach().cpu().numpy()[attack_mask],
                    eps=eps,
                    steps=steps,
                    seed=seed + epoch + start,
                    random_start=True,
                )
                xb[torch.as_tensor(attack_mask, device=device)] = torch.as_tensor(
                    crafted, dtype=torch.float32, device=device
                )
            robust.train()
            opt.zero_grad()
            loss = loss_fn(robust(xb), yb)
            loss.backward()
            opt.step()
    threshold = best_threshold(predict_scores(robust, x), y)
    return robust, float(threshold)
