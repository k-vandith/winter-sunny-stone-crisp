"""Detection latency helpers."""

from __future__ import annotations

import time
from collections.abc import Callable

import numpy as np


def detection_latency_ms(predict: Callable[[np.ndarray], np.ndarray], rows: np.ndarray) -> float:
    """Milliseconds per flow for one forward pass. Attack crafting is not included."""
    start = time.perf_counter()
    predict(rows)
    elapsed = time.perf_counter() - start
    return (elapsed * 1000.0) / max(1, len(rows))
