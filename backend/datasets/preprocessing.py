"""Train-only imputation, encoding, and min-max scaling into [0, 1]."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from backend.config import MAX_FEATURES


@dataclass
class TabularPreprocessor:
    numeric: list[str] = field(default_factory=list)
    categorical: list[str] = field(default_factory=list)
    medians: dict[str, float] = field(default_factory=dict)
    categories: dict[str, list[str]] = field(default_factory=dict)
    feature_names: list[str] = field(default_factory=list)
    keep: np.ndarray | None = None
    lo: np.ndarray | None = None
    span: np.ndarray | None = None
    _all_names: list[str] = field(default_factory=list)

    def fit(self, frame: pd.DataFrame, columns: list[str]) -> "TabularPreprocessor":
        self.numeric = []
        self.categorical = []
        for column in columns:
            series = frame[column]
            numeric = pd.to_numeric(series, errors="coerce")
            # Treat a column as categorical when most values are not numeric.
            if numeric.notna().mean() >= 0.9:
                self.numeric.append(column)
            else:
                self.categorical.append(column)
        self.medians = {}
        for column in self.numeric:
            series = pd.to_numeric(frame[column], errors="coerce").replace([np.inf, -np.inf], np.nan)
            self.medians[column] = float(series.median()) if series.notna().any() else 0.0
        self.categories = {}
        for column in self.categorical:
            values = frame[column].astype(str).fillna("missing")
            self.categories[column] = values.value_counts().head(12).index.tolist()
        assembled = self._assemble(frame)
        self._all_names = self._names()
        std = assembled.std(axis=0)
        keep = std > 1e-8
        if not keep.any():
            keep = np.zeros(assembled.shape[1], dtype=bool)
            keep[0] = True
        if int(keep.sum()) > MAX_FEATURES:
            variance = assembled.var(axis=0)
            variance = np.where(keep, variance, -1.0)
            chosen = np.argsort(variance)[-MAX_FEATURES:]
            mask = np.zeros(assembled.shape[1], dtype=bool)
            mask[chosen] = True
            keep = mask
        self.keep = keep
        self.feature_names = [name for name, flag in zip(self._all_names, keep) if flag]
        kept = assembled[:, keep]
        self.lo = kept.min(axis=0)
        hi = kept.max(axis=0)
        self.span = np.where(hi - self.lo < 1e-8, 1.0, hi - self.lo)
        return self

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        if self.keep is None or self.lo is None or self.span is None:
            raise RuntimeError("Preprocessor used before fit.")
        assembled = self._assemble(frame)[:, self.keep]
        scaled = (assembled - self.lo) / self.span
        return np.clip(scaled, 0.0, 1.0).astype(np.float64)

    def _names(self) -> list[str]:
        names = list(self.numeric)
        for column, levels in self.categories.items():
            names.extend(f"{column}={level}" for level in levels)
        return names

    def _assemble(self, frame: pd.DataFrame) -> np.ndarray:
        parts: list[np.ndarray] = []
        for column in self.numeric:
            series = pd.to_numeric(frame[column], errors="coerce").replace([np.inf, -np.inf], np.nan)
            filled = series.fillna(self.medians.get(column, 0.0)).to_numpy(dtype=np.float64)
            parts.append(filled.reshape(-1, 1))
        for column, levels in self.categories.items():
            values = frame[column].astype(str).fillna("missing").to_numpy()
            for level in levels:
                parts.append((values == level).astype(np.float64).reshape(-1, 1))
        if not parts:
            raise ValueError("No usable columns after preprocessing.")
        return np.concatenate(parts, axis=1)


def stratified_split(
    frame: pd.DataFrame,
    seed: int,
    test_ratio: float,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Family-stratified split. The test fraction is drawn inside each family."""
    rng = np.random.default_rng(seed)
    train_parts: list[pd.DataFrame] = []
    test_parts: list[pd.DataFrame] = []
    for _family, group in frame.groupby("family", sort=False):
        index = group.index.to_numpy().copy()
        rng.shuffle(index)
        if len(index) == 1:
            train_parts.append(frame.loc[index])
            continue
        test_n = max(1, int(round(len(index) * test_ratio)))
        test_n = min(test_n, len(index) - 1)
        test_parts.append(frame.loc[index[:test_n]])
        train_parts.append(frame.loc[index[test_n:]])
    if not test_parts:
        raise ValueError("Every family had a single flow, so no held-out test set could be built.")
    train = pd.concat(train_parts, ignore_index=True)
    test = pd.concat(test_parts, ignore_index=True)
    train = train.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    test = test.sample(frac=1.0, random_state=seed + 1).reset_index(drop=True)
    return train, test
