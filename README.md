# AdversarialShield

A working attack, defense, and scoring bench for machine-learning intrusion detection.

The dashboard is the existing React interface. All training, attacks, defenses, and metrics run in a Python API. Moving the epsilon slider rescores the models that are already in memory. It does not train them again.

## What the bench does

- Datasets: NSL-KDD (recorded stratified subsample of KDDTrain+), CICIDS2017, and UNSW-NB15.
- CICIDS2017 and UNSW-NB15 stay in **scenario mode** until you add the real files. The interface says so. They are not presented as the public captures.
- Models, in dashboard order: random forest, linear SVC, PyTorch network, feature squeeze, adversarial training, majority vote, and the hybrid defense.
- Attacks: FGSM and PGD under an L∞ budget. Gradients are taken from the PyTorch network. The forest and the SVM are scored by **transfer**. They are not given invented gradients.
- Non-adaptive attacks use the Adversarial Robustness Toolbox (`FastGradientMethod`, `ProjectedGradientDescent`) when it imports. The signed step is the CleverHans / Goodfellow FGSM update. Squeeze-aware attacks use a straight-through estimator through the training-fit quantizer.
- ASRS = 0.10·r(0.05) + 0.20·r(0.10) + 0.30·r(0.20) + 0.40·r(0.30), where r(ε) = min(1, F1 at ε / clean F1). Attack success rate is a separate metric.

## Windows setup

Use two terminals from the project root. Python 3.11 or newer.

Python API:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Frontend, in a second terminal:

```
npm install
npm run dev
```

The dashboard is the Vite dev server (port 8080 in this project). It proxies `/api` to the Python process at [http://localhost:8000](http://localhost:8000).

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

Linux or macOS uses the same commands, with `source .venv/bin/activate` instead of `.venv\Scripts\activate`.

## Real dataset files

Drop files here and train again. The picker switches from scenario to recorded when it finds them.

| Dataset | Folder | Expected files |
| --- | --- | --- |
| NSL-KDD | `datasets/raw/nsl-kdd/` | `KDDTrain+.txt` or a CSV with a label column |
| CICIDS2017 | `datasets/raw/cicids2017/` | Day CSV files with a `Label` column |
| UNSW-NB15 | `datasets/raw/unsw-nb15/` | CSV with `attack_cat` or `label` |

The shipped NSL-KDD table is `datasets/processed/nsl-kdd-sample.csv` (1,772 flows: 720 normal, 480 DoS, 300 probe, 220 R2L, 52 U2R). It is used when no raw NSL-KDD file is present. The loader reads at most 40,000 rows from a supplied capture, then applies the flow limit from the sidebar.

Preprocessing fits imputation, one-hot categories, and min-max scaling on the training split only. The test split is transformed with those training parameters.

## Tests

```
.venv\Scripts\activate
pytest backend/tests -q
```

On Linux or macOS: `source .venv/bin/activate` then the same pytest command.

Frontend checks from the project root:

```
npm run typecheck
npm run build
```

## API

- `GET /api/health`
- `GET /api/datasets`
- `POST /api/bench/train` with `dataset`, `seed`, `limit`, `attack`, `epsilon`, `steps`
- `GET /api/bench/results/{run_id}` while training is in progress
- `POST /api/bench/rescore` with `run_id`, `attack`, `epsilon`, `steps`, `full`

`full: false` (the epsilon slider) recomputes attacked metrics and flow examples only. ASRS and the curve stay on the attack family and PGD step count already scored.

## Attack and defense notes

FGSM: `x_adv = x + ε · sign(∇_x loss)`.

PGD: random start inside the ε-ball, repeated signed steps, projection onto the ball, and a clip to `[0, 1]`. Only intrusion rows are perturbed.

Hybrid defense: squeeze the features, then alert if the adversarially trained network alerts, or if the defended forest and the defended SVM both alert.
