"""Public evaluation entry used by the API after training and on rescore."""

from __future__ import annotations

from backend.evaluation.benchmarking import evaluate_state
from backend.services.state import RunState


def score_run(
    state: RunState,
    attack: str,
    epsilon: float,
    steps: int,
    with_asrs: bool = True,
    with_curve: bool = True,
) -> dict:
    return evaluate_state(state, attack, epsilon, steps, with_asrs, with_curve)
