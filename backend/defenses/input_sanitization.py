"""Feature squeezing fit on training rows only."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch

from backend.config import SQUEEZE_STEP


@dataclass
class Sanitizer:
    lo: np.ndarray
    hi: np.ndarray
    step: float


def fit_sanitizer(x_train: np.ndarray, step: float = SQUEEZE_STEP) -> Sanitizer:
    lo = np.quantile(x_train, 0.02, axis=0).astype(np.float64)
    hi = np.quantile(x_train, 0.98, axis=0).astype(np.float64)
    return Sanitizer(lo=lo, hi=hi, step=float(step))


def sanitize(x: np.ndarray, sanitizer: Sanitizer) -> np.ndarray:
    clipped = np.minimum(sanitizer.hi, np.maximum(sanitizer.lo, x))
    quantized = np.round(clipped / sanitizer.step) * sanitizer.step
    return np.clip(quantized, 0.0, 1.0)


def squeeze_ste(x: torch.Tensor, sanitizer: Sanitizer) -> torch.Tensor:
    """Straight-through squeeze: forward pass quantizes, backward pass is identity."""
    lo = torch.as_tensor(sanitizer.lo, dtype=x.dtype, device=x.device)
    hi = torch.as_tensor(sanitizer.hi, dtype=x.dtype, device=x.device)
    clipped = torch.maximum(torch.minimum(x, hi), lo)
    quantized = torch.round(clipped / sanitizer.step) * sanitizer.step
    quantized = quantized.clamp(0.0, 1.0)
    return x + (quantized - x).detach()
