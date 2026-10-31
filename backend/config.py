"""Paths and experiment defaults for the AdversarialShield bench."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_RAW = ROOT / "datasets" / "raw"
DATA_PROCESSED = ROOT / "datasets" / "processed"
SAVED_MODELS = ROOT / "backend" / "saved_models"

NSL_SAMPLE = DATA_PROCESSED / "nsl-kdd-sample.csv"

DEFAULT_SEED = 10
DEFAULT_LIMIT = 1400
TEST_RATIO = 0.30

ASRS_EPS = (0.05, 0.10, 0.20, 0.30)
ASRS_WEIGHTS = (0.10, 0.20, 0.30, 0.40)
CURVE_EPS = (0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30)

DNN_EPOCHS = 16
DNN_HIDDEN = 48
DNN_LR = 0.02
AT_EPOCHS = 5
AT_EPS = 0.15
AT_STEPS = 4
RF_TREES = 40
RF_DEPTH = 16
SQUEEZE_STEP = 0.02
MAX_REAL_ROWS = 40000
MAX_FEATURES = 36
