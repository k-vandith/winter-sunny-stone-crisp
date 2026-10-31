"""NSL-KDD, CICIDS2017, and UNSW-NB15 loading.

The shipped NSL-KDD file is a real stratified subsample of KDDTrain+.
CICIDS2017 and UNSW-NB15 stay in scenario mode until CSV or text captures
are placed under datasets/raw. Scenario rows are never described as the
public benchmark files.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from backend.config import DATA_RAW, MAX_REAL_ROWS, NSL_SAMPLE, TEST_RATIO
from backend.datasets.preprocessing import TabularPreprocessor, stratified_split
from backend.datasets.validation import validate_arrays

NSL_FEATURES = [
    "duration",
    "src_bytes",
    "dst_bytes",
    "logged_in",
    "num_failed_logins",
    "is_guest_login",
    "count",
    "srv_count",
    "serror_rate",
    "rerror_rate",
    "same_srv_rate",
    "diff_srv_rate",
    "dst_host_count",
    "dst_host_srv_count",
    "dst_host_same_srv_rate",
    "dst_host_serror_rate",
]

CIC_FEATURES = [
    "flow_duration",
    "tot_fwd_pkts",
    "tot_bwd_pkts",
    "flow_byts_s",
    "flow_pkts_s",
    "pkt_len_mean",
    "flow_iat_mean",
    "syn_flag",
    "ack_flag",
    "fwd_init_win",
    "bwd_init_win",
    "idle_mean",
]

UNSW_FEATURES = [
    "dur",
    "spkts",
    "dpkts",
    "sbytes",
    "dbytes",
    "rate",
    "sttl",
    "sload",
    "dload",
    "sinpkt",
    "ct_srv_src",
    "ct_state_ttl",
]

NSL_COLUMNS = [
    "duration",
    "protocol_type",
    "service",
    "flag",
    "src_bytes",
    "dst_bytes",
    "land",
    "wrong_fragment",
    "urgent",
    "hot",
    "num_failed_logins",
    "logged_in",
    "num_compromised",
    "root_shell",
    "su_attempted",
    "num_root",
    "num_file_creations",
    "num_shells",
    "num_access_files",
    "num_outbound_cmds",
    "is_host_login",
    "is_guest_login",
    "count",
    "srv_count",
    "serror_rate",
    "srv_serror_rate",
    "rerror_rate",
    "srv_rerror_rate",
    "same_srv_rate",
    "diff_srv_rate",
    "srv_diff_host_rate",
    "dst_host_count",
    "dst_host_srv_count",
    "dst_host_same_srv_rate",
    "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate",
    "dst_host_srv_serror_rate",
    "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate",
    "label",
    "difficulty",
]

DOS = {
    "back", "land", "neptune", "pod", "smurf", "teardrop", "mailbomb", "apache2", "processtable", "udpstorm",
}
PROBE = {"satan", "ipsweep", "nmap", "portsweep", "mscan", "saint"}
R2L = {
    "guess_passwd", "ftp_write", "imap", "phf", "multihop", "warezmaster", "warezclient", "spy",
    "xlock", "xsnoop", "snmpguess", "snmpgetattack", "httptunnel", "sendmail", "named", "worm",
}
U2R = {"buffer_overflow", "loadmodule", "rootkit", "perl", "sqlattack", "xterm", "ps"}

CIC_PROFILES = [
    ("normal", 0.50, [0.22, 0.28, 0.36, 0.34, 0.22, 0.48, 0.3, 0.08, 0.72, 0.55, 0.5, 0.18]),
    ("dos", 0.24, [0.08, 0.86, 0.12, 0.1, 0.9, 0.14, 0.08, 0.88, 0.16, 0.2, 0.12, 0.06]),
    ("probe", 0.16, [0.3, 0.22, 0.1, 0.12, 0.48, 0.16, 0.2, 0.62, 0.22, 0.28, 0.18, 0.1]),
    ("r2l", 0.10, [0.46, 0.18, 0.2, 0.22, 0.16, 0.26, 0.42, 0.14, 0.58, 0.4, 0.36, 0.28]),
]
UNSW_PROFILES = [
    ("normal", 0.52, [0.2, 0.3, 0.34, 0.4, 0.46, 0.18, 0.22, 0.28, 0.42, 0.36, 0.24, 0.12]),
    ("dos", 0.22, [0.06, 0.78, 0.1, 0.12, 0.08, 0.9, 0.84, 0.2, 0.06, 0.08, 0.82, 0.7]),
    ("probe", 0.16, [0.18, 0.24, 0.12, 0.16, 0.1, 0.55, 0.48, 0.16, 0.1, 0.14, 0.7, 0.36]),
    ("r2l", 0.10, [0.42, 0.16, 0.18, 0.28, 0.2, 0.14, 0.3, 0.22, 0.18, 0.4, 0.28, 0.22]),
]


@dataclass
class LoadedData:
    dataset_id: str
    name: str
    kind: str
    origin: str
    summary: str
    feature_names: list[str]
    x_train: np.ndarray
    y_train: np.ndarray
    family_train: np.ndarray
    x_test: np.ndarray
    y_test: np.ndarray
    family_test: np.ndarray
    source: str


def _raw_files(folder_name: str) -> list[Path]:
    folder = DATA_RAW / folder_name
    if not folder.exists():
        return []
    found: list[Path] = []
    for path in sorted(folder.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".csv", ".txt", ".data"}:
            continue
        if path.name.startswith("."):
            continue
        if path.stat().st_size < 64:
            continue
        found.append(path)
    return found


def _limit_frame(frame: pd.DataFrame, limit: int, seed: int) -> pd.DataFrame:
    if len(frame) <= limit:
        return frame.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    rng = np.random.default_rng(seed)
    groups = {str(family): group for family, group in frame.groupby("family", sort=False)}
    families = list(groups)
    alloc = {
        family: max(1, int(round(limit * (len(group) / len(frame)))))
        for family, group in groups.items()
    }
    while sum(alloc.values()) > limit:
        donor = max(families, key=lambda name: alloc[name])
        if alloc[donor] <= 1:
            break
        alloc[donor] -= 1
    while sum(alloc.values()) < limit:
        room = [family for family in families if alloc[family] < len(groups[family])]
        if not room:
            break
        alloc[max(room, key=lambda name: len(groups[name]) - alloc[name])] += 1
    pieces: list[pd.DataFrame] = []
    for family, group in groups.items():
        take = min(alloc[family], len(group))
        choice = rng.choice(len(group), size=take, replace=False)
        pieces.append(group.iloc[choice])
    out = pd.concat(pieces, ignore_index=True)
    return out.sample(frac=1.0, random_state=seed).reset_index(drop=True)


def _xy(frame: pd.DataFrame, features: list[str]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    x = frame[features].to_numpy(dtype=np.float64)
    x = np.clip(np.nan_to_num(x, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0)
    y = (frame["family"].to_numpy() != "normal").astype(np.int64)
    families = frame["family"].astype(str).to_numpy()
    return x, y, families


def _finish_scaled(
    dataset_id: str,
    name: str,
    kind: str,
    origin: str,
    summary: str,
    source: str,
    frame: pd.DataFrame,
    features: list[str],
    seed: int,
) -> LoadedData:
    limited = _limit_frame(frame, max(len(frame), 1), seed)
    train, test = stratified_split(limited, seed, TEST_RATIO)
    x_train, y_train, family_train = _xy(train, features)
    x_test, y_test, family_test = _xy(test, features)
    validate_arrays(x_train, y_train, family_train, "train")
    validate_arrays(x_test, y_test, family_test, "test")
    return LoadedData(
        dataset_id=dataset_id,
        name=name,
        kind=kind,
        origin=origin,
        summary=summary,
        feature_names=list(features),
        x_train=x_train,
        y_train=y_train,
        family_train=family_train,
        x_test=x_test,
        y_test=y_test,
        family_test=family_test,
        source=source,
    )


def _finish_raw(
    dataset_id: str,
    name: str,
    origin: str,
    summary: str,
    source: str,
    frame: pd.DataFrame,
    feature_columns: list[str],
    seed: int,
    limit: int,
) -> LoadedData:
    limited = _limit_frame(frame, limit, seed)
    train_df, test_df = stratified_split(limited, seed, TEST_RATIO)
    preprocessor = TabularPreprocessor().fit(train_df, feature_columns)
    x_train = preprocessor.transform(train_df)
    x_test = preprocessor.transform(test_df)
    y_train = (train_df["family"].to_numpy() != "normal").astype(np.int64)
    y_test = (test_df["family"].to_numpy() != "normal").astype(np.int64)
    family_train = train_df["family"].astype(str).to_numpy()
    family_test = test_df["family"].astype(str).to_numpy()
    validate_arrays(x_train, y_train, family_train, "train")
    validate_arrays(x_test, y_test, family_test, "test")
    return LoadedData(
        dataset_id=dataset_id,
        name=name,
        kind="recorded",
        origin=origin,
        summary=summary,
        feature_names=preprocessor.feature_names,
        x_train=x_train,
        y_train=y_train,
        family_train=family_train,
        x_test=x_test,
        y_test=y_test,
        family_test=family_test,
        source=source,
    )


def nsl_family(label: object) -> str:
    text = str(label).strip().lower().rstrip(".")
    if text == "normal":
        return "normal"
    if text in DOS:
        return "dos"
    if text in PROBE:
        return "probe"
    if text in R2L:
        return "r2l"
    if text in U2R:
        return "u2r"
    return "dos"


def cic_family(label: object) -> str:
    text = str(label).strip().lower()
    if text in {"benign", "normal"}:
        return "normal"
    if any(token in text for token in ("dos", "ddos", "hulk", "goldeneye", "slowloris", "slowhttp")):
        return "dos"
    if "portscan" in text or "port scan" in text:
        return "probe"
    if any(token in text for token in ("brute", "patator", "web attack", "ftp", "ssh")):
        return "r2l"
    return "u2r"


def unsw_family(category: object, label: object) -> str:
    text = str(category).strip().lower()
    mapping = {
        "normal": "normal",
        "dos": "dos",
        "generic": "dos",
        "fuzzers": "probe",
        "reconnaissance": "probe",
        "analysis": "probe",
        "exploits": "r2l",
        "backdoor": "r2l",
        "backdoors": "r2l",
        "shellcode": "u2r",
        "worms": "u2r",
    }
    if text in mapping:
        return mapping[text]
    try:
        if int(float(label)) == 0:
            return "normal"
    except (TypeError, ValueError):
        pass
    return "dos"


def _read_table(path: Path, cap: int, header: int | None = 0) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    seen = 0
    reader = pd.read_csv(path, chunksize=20000, low_memory=False, on_bad_lines="skip", header=header)
    for chunk in reader:
        if header is not None:
            chunk.columns = [str(column).strip() for column in chunk.columns]
        frames.append(chunk)
        seen += len(chunk)
        if seen >= cap:
            break
    if not frames:
        raise ValueError(f"Could not read {path.name}.")
    return pd.concat(frames, ignore_index=True).head(cap)


def _headerless_nsl(path: Path) -> bool:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        first = handle.readline().strip()
    parts = first.split(",")
    if len(parts) < 42:
        return False
    try:
        float(parts[0])
    except ValueError:
        return False
    return True


def _load_nsl_sample(seed: int, limit: int) -> LoadedData:
    frame = pd.read_csv(NSL_SAMPLE)
    frame["family"] = frame["family"].astype(str)
    limited = _limit_frame(frame, limit, seed)
    summary = (
        "Stratified subsample of the real KDDTrain+ file: 720 normal, 480 DoS, 300 probe, "
        "220 R2L, and all 52 U2R rows. Bytes and counts are scaled into [0, 1]; rates are unchanged."
    )
    return _finish_scaled(
        "nsl-kdd",
        "NSL-KDD",
        "recorded",
        "KDDTrain+ · University of New Brunswick",
        summary,
        str(NSL_SAMPLE.name),
        limited,
        NSL_FEATURES,
        seed,
    )


def _load_nsl_raw(files: list[Path], seed: int, limit: int) -> LoadedData:
    frames: list[pd.DataFrame] = []
    for path in files:
        table = _read_table(path, MAX_REAL_ROWS, header=None if _headerless_nsl(path) else 0)
        if "label" in table.columns or "class" in table.columns:
            label_col = "label" if "label" in table.columns else "class"
            table["family"] = table[label_col].map(nsl_family)
            drop = {label_col, "difficulty", "family"}
            features = [column for column in table.columns if column not in drop]
        elif table.shape[1] >= 42:
            width = table.shape[1]
            names = NSL_COLUMNS[:width]
            table.columns = names
            label_col = "label" if "label" in table.columns else names[-1]
            table["family"] = table[label_col].map(nsl_family)
            features = [column for column in table.columns if column not in {label_col, "difficulty", "family"}]
        else:
            raise ValueError(f"{path.name} is not an NSL-KDD table this loader recognizes.")
        table = table.dropna(subset=["family"])
        frames.append(table)
    frame = pd.concat(frames, ignore_index=True)
    feature_columns = [column for column in frame.columns if column != "family"]
    # Prefer the classic feature block when present; drop the label leftovers.
    feature_columns = [column for column in feature_columns if column not in {"label", "difficulty", "class"}]
    source = ", ".join(path.name for path in files)
    summary = (
        f"Recorded NSL-KDD from {source}. Categories are one-hot encoded and numeric fields "
        "are min-max scaled using the training split only."
    )
    return _finish_raw(
        "nsl-kdd",
        "NSL-KDD",
        "KDDTrain+ · University of New Brunswick",
        summary,
        source,
        frame,
        feature_columns,
        seed,
        limit,
    )


def _scenario(seed: int, features: list[str], std: float, profiles: list[tuple], n: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    weights = np.array([profile[1] for profile in profiles], dtype=np.float64)
    weights = weights / weights.sum()
    picks = rng.choice(len(profiles), size=n, p=weights)
    means = np.stack([np.asarray(profile[2], dtype=np.float64) for profile in profiles])
    chosen = means[picks]
    noisy = chosen + rng.normal(0.0, std, size=chosen.shape)
    values = np.clip(np.round(noisy * 1000.0) / 1000.0, 0.0, 1.0)
    families = np.array([profiles[index][0] for index in picks])
    frame = pd.DataFrame(values, columns=list(features))
    frame.insert(0, "family", families)
    return frame


def load_dataset(dataset_id: str, seed: int, limit: int) -> LoadedData:
    limit = int(max(40, limit))
    seed = int(seed)
    if dataset_id == "nsl-kdd":
        files = _raw_files("nsl-kdd")
        if files:
            return _load_nsl_raw(files, seed, limit)
        if not NSL_SAMPLE.exists():
            raise FileNotFoundError("The NSL-KDD subsample is missing from datasets/processed.")
        return _load_nsl_sample(seed, limit)
    if dataset_id == "cicids2017":
        files = _raw_files("cicids2017")
        if files:
            return _load_cic_raw(files, seed, limit)
        frame = _scenario(seed + 17, CIC_FEATURES, 0.13, CIC_PROFILES, max(limit, 1600))
        summary = (
            "Scenario mode, not the CICIDS2017 capture. Class-conditional flows on the CIC numeric "
            "schema (duration, packet counts, SYN/ACK, window sizes). Place the real CSV files in "
            "datasets/raw/cicids2017 to score the recorded set."
        )
        return _finish_scaled(
            "cicids2017",
            "CICIDS2017",
            "scenario",
            "Flow-feature scenario · CIC schema",
            summary,
            "scenario",
            _limit_frame(frame, limit, seed + 99),
            CIC_FEATURES,
            seed,
        )
    if dataset_id == "unsw-nb15":
        files = _raw_files("unsw-nb15")
        if files:
            return _load_unsw_raw(files, seed, limit)
        frame = _scenario(seed + 41, UNSW_FEATURES, 0.12, UNSW_PROFILES, max(limit, 1600))
        summary = (
            "Scenario mode, not the UNSW-NB15 capture. Class-conditional flows on the UNSW schema "
            "(rate, TTL, load, connection counts). Place the real CSV files in datasets/raw/unsw-nb15 "
            "to score the recorded set."
        )
        return _finish_scaled(
            "unsw-nb15",
            "UNSW-NB15",
            "scenario",
            "Flow-feature scenario · UNSW schema",
            summary,
            "scenario",
            _limit_frame(frame, limit, seed + 99),
            UNSW_FEATURES,
            seed,
        )
    raise ValueError(f"Unknown dataset '{dataset_id}'.")


def _load_cic_raw(files: list[Path], seed: int, limit: int) -> LoadedData:
    frames = []
    for path in files:
        table = _read_table(path, MAX_REAL_ROWS)
        label_col = next((column for column in table.columns if column.lower() == "label"), None)
        if label_col is None:
            raise ValueError(f"{path.name} has no Label column.")
        table["family"] = table[label_col].map(cic_family)
        frames.append(table)
    frame = pd.concat(frames, ignore_index=True)
    drop = {"family", next(column for column in frame.columns if column.lower() == "label")}
    features = [column for column in frame.columns if column not in drop]
    source = ", ".join(path.name for path in files)
    summary = (
        f"Recorded CICIDS2017 from {source}. Numeric fields are imputed and min-max scaled "
        "on the training split only, then sampled down to the selected flow limit."
    )
    return _finish_raw(
        "cicids2017",
        "CICIDS2017",
        "Canadian Institute for Cybersecurity",
        summary,
        source,
        frame,
        features,
        seed,
        limit,
    )


def _load_unsw_raw(files: list[Path], seed: int, limit: int) -> LoadedData:
    frames = []
    for path in files:
        table = _read_table(path, MAX_REAL_ROWS)
        lowered = {column.lower(): column for column in table.columns}
        if "attack_cat" in lowered:
            category = lowered["attack_cat"]
            label = lowered.get("label")
            if label is None:
                table["family"] = table[category].map(lambda value: unsw_family(value, 1))
            else:
                table["family"] = [
                    unsw_family(cat, lab) for cat, lab in zip(table[category], table[label], strict=False)
                ]
        elif "label" in lowered:
            table["family"] = table[lowered["label"]].map(lambda value: "normal" if str(value) in {"0", "0.0", "normal"} else "dos")
        else:
            raise ValueError(f"{path.name} has no attack_cat or label column.")
        frames.append(table)
    frame = pd.concat(frames, ignore_index=True)
    banned = {"family", "attack_cat", "label", "id", "index"}
    features = [column for column in frame.columns if column.lower() not in banned]
    source = ", ".join(path.name for path in files)
    summary = (
        f"Recorded UNSW-NB15 from {source}. Categories are encoded and numeric fields are "
        "min-max scaled on the training split only."
    )
    return _finish_raw(
        "unsw-nb15",
        "UNSW-NB15",
        "UNSW Canberra Cyber",
        summary,
        source,
        frame,
        features,
        seed,
        limit,
    )


def dataset_catalog() -> list[dict]:
    """Metadata for the dataset picker. Does not train models."""
    nsl_files = _raw_files("nsl-kdd")
    cic_files = _raw_files("cicids2017")
    unsw_files = _raw_files("unsw-nb15")
    if nsl_files:
        nsl_summary = (
            f"Recorded NSL-KDD from {', '.join(path.name for path in nsl_files)}. "
            "The training split owns encoding and scaling."
        )
        nsl_origin = "KDDTrain+ · University of New Brunswick"
    else:
        nsl_summary = (
            "Stratified subsample of the real KDDTrain+ file: 720 normal, 480 DoS, 300 probe, "
            "220 R2L, and all 52 U2R rows. Bytes and counts are scaled into [0, 1]; rates are unchanged."
        )
        nsl_origin = "KDDTrain+ · University of New Brunswick"
    if cic_files:
        cic_kind = "recorded"
        cic_summary = f"Recorded CICIDS2017 from {', '.join(path.name for path in cic_files)}."
        cic_origin = "Canadian Institute for Cybersecurity"
    else:
        cic_kind = "scenario"
        cic_summary = (
            "Class-conditional flows on the CICIDS2017 numeric schema (duration, packet counts, "
            "SYN/ACK, window sizes). Same pipeline as NSL-KDD. Scenario mode — not the raw capture."
        )
        cic_origin = "Flow-feature scenario · CIC schema"
    if unsw_files:
        unsw_kind = "recorded"
        unsw_summary = f"Recorded UNSW-NB15 from {', '.join(path.name for path in unsw_files)}."
        unsw_origin = "UNSW Canberra Cyber"
    else:
        unsw_kind = "scenario"
        unsw_summary = (
            "Class-conditional flows on the UNSW-NB15 schema (rate, TTL, load, connection counts). "
            "Used to check that the defense is not an NSL-KDD-only trick. Scenario mode — not the raw capture."
        )
        unsw_origin = "Flow-feature scenario · UNSW schema"
    return [
        {
            "id": "nsl-kdd",
            "name": "NSL-KDD",
            "kind": "recorded",
            "origin": nsl_origin,
            "summary": nsl_summary,
            "features": NSL_FEATURES,
        },
        {
            "id": "cicids2017",
            "name": "CICIDS2017",
            "kind": cic_kind,
            "origin": cic_origin,
            "summary": cic_summary,
            "features": CIC_FEATURES,
        },
        {
            "id": "unsw-nb15",
            "name": "UNSW-NB15",
            "kind": unsw_kind,
            "origin": unsw_origin,
            "summary": unsw_summary,
            "features": UNSW_FEATURES,
        },
    ]
