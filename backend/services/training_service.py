"""Fit the seven-model bench and keep the held-out split attached to the run."""

from __future__ import annotations

import json
import time
from collections.abc import Callable

import joblib
import numpy as np
import torch

from backend.attacks.attack_pipeline import craft_attack
from backend.config import AT_EPOCHS, AT_EPS, AT_STEPS, DNN_EPOCHS, DNN_HIDDEN, DNN_LR, SAVED_MODELS
from backend.datasets.loader import load_dataset
from backend.defenses.adversarial_training import train_adversarial
from backend.defenses.input_sanitization import fit_sanitizer
from backend.models.dnn import train_dnn
from backend.models.random_forest import train_random_forest
from backend.models.svm import train_svm
from backend.services.state import RunState


def train_run(
    dataset_id: str,
    seed: int,
    limit: int,
    run_id: str,
    progress: Callable[[str], None] | None = None,
) -> RunState:
    def report(message: str) -> None:
        if progress:
            progress(message)

    started = time.perf_counter()
    report("Loading and preprocessing the dataset")
    loaded = load_dataset(dataset_id, seed, limit)

    report("Training the random forest")
    forest, forest_threshold = train_random_forest(loaded.x_train, loaded.y_train, seed)

    report("Training the linear SVM")
    svm, svm_scaler, svm_threshold = train_svm(loaded.x_train, loaded.y_train, seed)

    report("Training the network on clean flows")
    network, network_threshold = train_dnn(
        loaded.x_train,
        loaded.y_train,
        seed,
        epochs=DNN_EPOCHS,
        hidden=DNN_HIDDEN,
        lr=DNN_LR,
    )

    report("Generating adversarial training flows")
    intrusion = np.flatnonzero(loaded.y_train == 1)
    if intrusion.size == 0:
        x_aug = loaded.x_train
        y_aug = loaded.y_train
    else:
        attacked = craft_attack(
            network,
            loaded.x_train[intrusion],
            np.ones(intrusion.size, dtype=int),
            "pgd",
            AT_EPS,
            AT_STEPS,
            None,
            seed + 5,
        )
        x_aug = np.vstack([loaded.x_train, attacked])
        y_aug = np.concatenate([loaded.y_train, np.ones(intrusion.size, dtype=int)])

    report("Refitting the forest and SVM on augmented intrusions")
    forest_robust, forest_robust_threshold = train_random_forest(x_aug, y_aug, seed + 3)
    svm_robust, svm_robust_scaler, svm_robust_threshold = train_svm(x_aug, y_aug, seed + 3)

    report("Adversarial training of the network")
    robust_net, robust_threshold = train_adversarial(
        network,
        loaded.x_train,
        loaded.y_train,
        seed,
        epochs=AT_EPOCHS,
        eps=AT_EPS,
        steps=AT_STEPS,
    )

    report("Fitting feature squeeze on the training split")
    sanitizer = fit_sanitizer(loaded.x_train)
    trained_ms = (time.perf_counter() - started) * 1000.0

    state = RunState(
        run_id=run_id,
        dataset_id=loaded.dataset_id,
        kind=loaded.kind,
        seed=seed,
        limit=limit,
        feature_names=loaded.feature_names,
        train_n=int(len(loaded.y_train)),
        test_n=int(len(loaded.y_test)),
        normal_test=int(np.sum(loaded.y_test == 0)),
        attack_test=int(np.sum(loaded.y_test == 1)),
        trained_ms=float(trained_ms),
        x_test=loaded.x_test,
        y_test=loaded.y_test,
        families=loaded.family_test,
        rf=forest,
        rf_threshold=forest_threshold,
        svm=svm,
        svm_scaler=svm_scaler,
        svm_threshold=svm_threshold,
        dnn=network,
        dnn_threshold=network_threshold,
        at=robust_net,
        at_threshold=robust_threshold,
        rf_robust=forest_robust,
        rf_robust_threshold=forest_robust_threshold,
        svm_robust=svm_robust,
        svm_robust_scaler=svm_robust_scaler,
        svm_robust_threshold=svm_robust_threshold,
        sanitizer=sanitizer,
    )
    _persist(state)
    report("Scoring clean and adversarial traffic")
    return state


def _persist(state: RunState) -> None:
    folder = SAVED_MODELS / state.run_id
    folder.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "dnn": state.dnn.state_dict(),
            "at": state.at.state_dict(),
            "d_in": state.dnn.d_in,
            "hidden": state.dnn.hidden,
            "dnn_threshold": state.dnn_threshold,
            "at_threshold": state.at_threshold,
        },
        folder / "nets.pt",
    )
    joblib.dump(
        {
            "rf": state.rf,
            "rf_threshold": state.rf_threshold,
            "svm": state.svm,
            "svm_scaler": state.svm_scaler,
            "svm_threshold": state.svm_threshold,
            "rf_robust": state.rf_robust,
            "rf_robust_threshold": state.rf_robust_threshold,
            "svm_robust": state.svm_robust,
            "svm_robust_scaler": state.svm_robust_scaler,
            "svm_robust_threshold": state.svm_robust_threshold,
            "sanitizer": state.sanitizer,
        },
        folder / "sklearn.joblib",
    )
    (folder / "meta.json").write_text(
        json.dumps(
            {
                "dataset": state.dataset_id,
                "kind": state.kind,
                "seed": state.seed,
                "limit": state.limit,
                "features": state.feature_names,
                "train_n": state.train_n,
                "test_n": state.test_n,
            },
            indent=2,
        )
    )
