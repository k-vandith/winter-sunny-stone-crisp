"""PyTorch intrusion network. Logits are used so FGSM and PGD keep a gradient."""

from __future__ import annotations

import numpy as np
import torch
from torch import nn

from backend.evaluation.metrics import best_threshold


class TrafficNet(nn.Module):
    def __init__(self, d_in: int, hidden: int = 48):
        super().__init__()
        self.d_in = int(d_in)
        self.hidden = int(hidden)
        self.fc1 = nn.Linear(self.d_in, self.hidden)
        self.fc2 = nn.Linear(self.hidden, self.hidden)
        self.fc3 = nn.Linear(self.hidden, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        hidden = torch.relu(self.fc1(x))
        hidden = torch.relu(self.fc2(hidden))
        return self.fc3(hidden).squeeze(-1)


def torch_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def train_dnn(
    x: np.ndarray,
    y: np.ndarray,
    seed: int,
    epochs: int = 16,
    hidden: int = 48,
    lr: float = 0.02,
    device: torch.device | None = None,
) -> tuple[TrafficNet, float]:
    device = device or torch_device()
    torch.manual_seed(seed)
    model = TrafficNet(x.shape[1], hidden).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.BCEWithLogitsLoss()
    xt = torch.as_tensor(x, dtype=torch.float32, device=device)
    yt = torch.as_tensor(y, dtype=torch.float32, device=device)
    generator = torch.Generator()
    generator.manual_seed(seed)
    batch = 64
    model.train()
    for _epoch in range(epochs):
        perm = torch.randperm(len(x), generator=generator)
        for start in range(0, len(x), batch):
            idx = perm[start : start + batch].to(device)
            opt.zero_grad()
            loss = loss_fn(model(xt[idx]), yt[idx])
            loss.backward()
            opt.step()
    threshold = best_threshold(predict_scores(model, x), y)
    return model, float(threshold)


@torch.no_grad()
def predict_scores(model: TrafficNet, x: np.ndarray) -> np.ndarray:
    device = next(model.parameters()).device
    was = model.training
    model.eval()
    xt = torch.as_tensor(np.asarray(x), dtype=torch.float32, device=device)
    scores = torch.sigmoid(model(xt)).detach().cpu().numpy().astype(np.float64)
    if was:
        model.train()
    return scores


def predict_dnn(model: TrafficNet, threshold: float, x: np.ndarray) -> np.ndarray:
    return (predict_scores(model, x) >= threshold).astype(np.int64)
