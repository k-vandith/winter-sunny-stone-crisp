"""Majority vote across the clean forest, linear SVM, and network."""

from __future__ import annotations

import numpy as np


def majority_vote(forest: np.ndarray, svm: np.ndarray, network: np.ndarray) -> np.ndarray:
    votes = np.asarray(forest).astype(int) + np.asarray(svm).astype(int) + np.asarray(network).astype(int)
    return (votes >= 2).astype(np.int64)
