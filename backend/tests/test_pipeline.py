"""Unit checks for data handling, attacks, defenses, and metrics."""

from __future__ import annotations

import numpy as np
import pandas as pd

from backend.attacks.attack_pipeline import craft_attack
from backend.attacks.fgsm import fast_gradient_sign
from backend.attacks.pgd import projected_gradient_descent
from backend.datasets.loader import load_dataset, nsl_family
from backend.datasets.preprocessing import TabularPreprocessor, stratified_split
from backend.defenses.hybrid_defense import hybrid_rule
from backend.defenses.input_sanitization import fit_sanitizer, sanitize
from backend.evaluation.metrics import attack_success, best_threshold, confusion
from backend.evaluation.robustness import asrs
from backend.models.adversarial_training import train_adversarial
from backend.models.dnn import train_dnn
from backend.models.ensemble import majority_vote
from backend.models.random_forest import train_random_forest
from backend.models.svm import train_svm
from backend.services.training_service import train_run


def test_nsl_label_mapping_and_loader():
    assert nsl_family("normal") == "normal"
    assert nsl_family("neptune.") == "dos"
    assert nsl_family("satan") == "probe"
    assert nsl_family("guess_passwd") == "r2l"
    assert nsl_family("buffer_overflow") == "u2r"
    loaded = load_dataset("nsl-kdd", seed=10, limit=240)
    assert loaded.kind == "recorded"
    assert loaded.x_train.shape[1] == 16
    assert set(np.unique(loaded.y_train)).issubset({0, 1})
    assert loaded.x_train.shape[0] + loaded.x_test.shape[0] <= 240
    assert loaded.x_train.min() >= 0 and loaded.x_train.max() <= 1
    # The shipped table is the real stratified subsample, not a scenario draw.
    assert "KDDTrain+" in loaded.origin


def test_scenario_datasets_are_labelled():
    cic = load_dataset("cicids2017", seed=3, limit=180)
    unsw = load_dataset("unsw-nb15", seed=3, limit=180)
    assert cic.kind == "scenario"
    assert unsw.kind == "scenario"
    assert "not the raw" in cic.summary or "Scenario" in cic.summary
    assert cic.x_train.shape[1] == 12
    assert unsw.feature_names[0] == "dur"


def test_split_and_scaler_use_train_only():
    rng = np.random.default_rng(0)
    families = np.array(["normal"] * 40 + ["dos"] * 40)
    frame = pd.DataFrame(
        {
            "family": families,
            "bytes": np.concatenate([rng.normal(1, 0.1, 40), rng.normal(5, 0.1, 40)]),
            "proto": ["tcp"] * 40 + ["udp"] * 40,
        }
    )
    train, test = stratified_split(frame, seed=4, test_ratio=0.3)
    assert len(train) + len(test) == len(frame)
    prep = TabularPreprocessor().fit(train, ["bytes", "proto"])
    x_train = prep.transform(train)
    # A test value far outside the training range must clip rather than extend the scale.
    outlier = test.copy()
    outlier.loc[outlier.index[0], "bytes"] = 10_000
    x_test = prep.transform(outlier)
    assert x_train.min() >= -1e-6 and x_train.max() <= 1 + 1e-6
    assert x_test.max() <= 1 + 1e-6
    assert abs(prep.lo[0] - train["bytes"].min()) < 1e-6


def test_models_and_defenses_on_a_separable_set():
    rng = np.random.default_rng(1)
    normal = rng.normal(0.2, 0.05, size=(80, 6))
    attack = rng.normal(0.8, 0.05, size=(80, 6))
    x = np.clip(np.vstack([normal, attack]), 0, 1)
    y = np.array([0] * 80 + [1] * 80)
    forest, forest_thr = train_random_forest(x, y, seed=1, trees=15, depth=6)
    svm, scaler, svm_thr = train_svm(x, y, seed=1)
    network, net_thr = train_dnn(x, y, seed=1, epochs=8, hidden=16, lr=0.05)
    robust, robust_thr = train_adversarial(network, x, y, seed=1, epochs=1, eps=0.05, steps=2)
    assert forest.predict(x[:4]).shape == (4,)
    assert svm.decision_function(scaler.transform(x[:4])).shape == (4,)
    assert 0 <= net_thr <= 1
    assert robust_thr == robust_thr
    votes = majority_vote(np.array([1, 0, 1]), np.array([1, 0, 0]), np.array([0, 1, 1]))
    assert list(votes) == [1, 0, 1]
    assert list(hybrid_rule(np.array([0, 0, 1]), np.array([1, 1, 0]), np.array([1, 0, 0]))) == [1, 0, 1]
    sanitizer = fit_sanitizer(x[:80])
    squeezed = sanitize(x[80:], sanitizer)
    assert squeezed.shape == x[80:].shape
    assert squeezed.min() >= 0 and squeezed.max() <= 1
    # Quantile bounds come from the benign half only.
    assert np.all(sanitizer.lo <= np.quantile(x[:80], 0.02, axis=0) + 1e-9)


def test_attack_constraints_and_transfer_shape():
    rng = np.random.default_rng(2)
    x = rng.random((30, 8))
    y = np.array([0] * 10 + [1] * 20)
    network, _thr = train_dnn(x, y, seed=2, epochs=3, hidden=8, lr=0.05)
    eps = 0.12
    for kind, steps in (("fgsm", 1), ("pgd", 5)):
        adv = craft_attack(network, x, y, kind, eps, steps, seed=9)
        assert adv.shape == x.shape
        assert np.allclose(adv[y == 0], x[y == 0])
        assert np.max(np.abs(adv - x)) <= eps + 1e-4
        assert adv.min() >= -1e-5 and adv.max() <= 1 + 1e-5
    native = fast_gradient_sign(network, x[y == 1], eps, seed=9)
    assert np.max(np.abs(native - x[y == 1])) <= eps + 1e-4
    iterated = projected_gradient_descent(network, x[y == 1], eps, steps=4, seed=9)
    assert np.max(np.abs(iterated - x[y == 1])) <= eps + 1e-4


def test_metrics_asrs_and_reproducible_forest():
    y = np.array([0, 0, 1, 1, 1])
    pred = np.array([0, 1, 1, 0, 1])
    stats = confusion(y, pred)
    assert stats["tp"] == 2 and stats["tn"] == 1 and stats["fp"] == 1 and stats["fn"] == 1
    assert abs(stats["precision"] - 2 / 3) < 1e-9
    assert abs(stats["recall"] - 2 / 3) < 1e-9
    assert abs(stats["fpr"] - 0.5) < 1e-9
    assert abs(stats["fnr"] - 1 / 3) < 1e-9
    asr = attack_success(np.array([1, 1, 1, 0]), np.array([1, 1, 0, 0]), np.array([0, 1, 0, 1]))
    assert abs(asr - 0.5) < 1e-9
    score = asrs(1.0, [1.0, 0.5, 0.5, 0.0])
    assert abs(score - 0.35) < 1e-9
    assert asrs(0.0, [0.0, 0.0, 0.0, 0.0]) <= 1
    threshold = best_threshold(np.array([0.1, 0.2, 0.8, 0.9]), np.array([0, 0, 1, 1]))
    assert 0.1 <= threshold <= 0.9
    x = np.random.default_rng(4).random((40, 5))
    labels = (x[:, 0] > 0.5).astype(int)
    first, thr_a = train_random_forest(x, labels, seed=4, trees=8, depth=4)
    second, thr_b = train_random_forest(x, labels, seed=4, trees=8, depth=4)
    assert abs(thr_a - thr_b) < 1e-9
    assert np.array_equal(first.predict(x), second.predict(x))


def test_fixed_seed_training_matches():
    first = train_run("nsl-kdd", 11, 160, "unit-a")
    second = train_run("nsl-kdd", 11, 160, "unit-b")
    assert np.array_equal(first.y_test, second.y_test)
    assert np.allclose(first.x_test, second.x_test)
    assert np.array_equal(first.rf.predict(first.x_test), second.rf.predict(second.x_test))
