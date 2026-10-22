#!/usr/bin/env python3
"""Joint predictive analysis for CONFIIA Study 02."""

from __future__ import annotations

import argparse
import json
import math
import shutil
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, RepeatedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from statsmodels.api import OLS, add_constant
from statsmodels.stats.multitest import multipletests

STUDY_ID = "confiia_ai_trust_behavioral_signals"
OUTCOME = "stias_index"

BASELINE_NUMERIC = [
    "initial_accuracy",
    "mean_initial_confidence",
    "mean_initial_rt_ms",
]

BASELINE_CATEGORICAL = [
    "ai_familiarity",
    "ai_use_frequency",
    "english_comfort",
    "input_method",
    "viewport_bucket",
    "coarse_pointer",
    "previous_confiia_study",
    "age_band",
    "sex_assigned_at_birth",
]

CLASSICAL_NUMERIC = [
    "ai_alignment_rate",
    "disagreement_trials",
    "switched_toward_ai_rate",
    "switched_away_ai_rate",
    "rair",
    "rsr",
    "mean_confidence_change",
    "mean_ai_confidence_shift",
    "mean_advice_rt_ms",
    "ai_alignment_fluency_ms",
]

PARADATA_NUMERIC = [
    "mean_pointer_path_px",
    "typing_key_count",
    "typing_printable_count",
    "typing_backspace_count",
    "typing_backspace_rate",
    "typing_first_key_latency_ms",
    "typing_mean_iki_ms",
    "typing_median_iki_ms",
    "typing_pause_count_1000ms",
    "typing_pause_time_ms",
    "typing_duration_ms",
    "typing_wpm",
    "typing_input_events",
    "typing_paste_events",
    "text_word_count",
    "text_conditional_count",
    "text_hedge_count",
    "text_human_agency_count",
    "text_ai_reference_count",
    "text_verification_count",
]

LOG_TRANSFORM = [
    "mean_initial_rt_ms",
    "mean_advice_rt_ms",
    "typing_first_key_latency_ms",
    "typing_mean_iki_ms",
    "typing_median_iki_ms",
    "typing_pause_time_ms",
    "typing_duration_ms",
    "mean_pointer_path_px",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", type=Path, help="Google Sheets CSV export")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("analysis-results"),
        help="Output directory (created if absent)",
    )
    parser.add_argument("--seed", type=int, default=20260722)
    parser.add_argument("--bootstrap", type=int, default=5000)
    return parser.parse_args()


def valid_item_json(value: Any) -> bool:
    try:
        records = json.loads(value)
        return isinstance(records, list) and len(records) >= 5
    except (TypeError, ValueError, json.JSONDecodeError):
        return False


def prepare_data(
    frame: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, int], pd.DataFrame]:
    """Retain every input row in an audit and pool available outcomes.

    Duration and item-JSON diagnostics do not determine eligibility. Known
    duplicate submission IDs are represented once; missing IDs are not assumed
    to identify the same person. No eligibility rule uses source or version.
    """
    counts = {"raw_rows": len(frame)}
    audit = pd.DataFrame({"analysis_input_row": np.arange(1, len(frame) + 1)})
    for column in ("study_id", "submission_id", "study_version", "recruitment_source"):
        if column in frame:
            audit[column] = frame[column].to_numpy(copy=True)
    audit["matching_study"] = frame["study_id"].eq(STUDY_ID).to_numpy()
    audit["duplicate_submission"] = False
    audit["outcome_available"] = np.isfinite(
        pd.to_numeric(frame[OUTCOME], errors="coerce").to_numpy(dtype=float)
    )
    duration = pd.to_numeric(
        frame.get("total_elapsed_ms", pd.Series(np.nan, index=frame.index)),
        errors="coerce",
    )
    audit["duration_below_90s"] = duration.lt(90000).to_numpy()
    audit["duration_unavailable"] = duration.isna().to_numpy()
    audit["item_json_valid"] = frame.get(
        "item_level_json", pd.Series(None, index=frame.index, dtype=object)
    ).map(valid_item_json).to_numpy()

    data = frame.reset_index(drop=True).copy()
    data["analysis_input_row"] = audit["analysis_input_row"]
    data = data.loc[audit["matching_study"]].copy()
    counts["matching_study"] = len(data)
    received = pd.to_datetime(
        data.get("server_received_utc", pd.Series(None, index=data.index)),
        errors="coerce",
        utc=True,
    )
    data = data.loc[received.sort_values(kind="stable").index]
    submission = data.get("submission_id", pd.Series("", index=data.index))
    known_id = submission.notna() & submission.astype(str).str.strip().ne("")
    duplicate = known_id & submission.duplicated(keep="first")
    audit.loc[data.index[duplicate], "duplicate_submission"] = True
    data = data.loc[~duplicate].copy()
    counts["after_deduplication"] = len(data)
    counts["duplicate_submissions"] = int(audit["duplicate_submission"].sum())

    audit["included_in_analysis"] = (
        audit["matching_study"]
        & ~audit["duplicate_submission"]
        & audit["outcome_available"]
    )
    audit["analysis_status"] = np.select(
        [
            ~audit["matching_study"],
            audit["duplicate_submission"],
            ~audit["outcome_available"],
        ],
        ["other_study", "duplicate_submission", "outcome_unavailable"],
        default="included",
    )
    data[OUTCOME] = pd.to_numeric(data[OUTCOME], errors="coerce")
    data = data.loc[audit.loc[data.index, "included_in_analysis"]].copy()
    counts["outcome_unavailable"] = int(
        audit["analysis_status"].eq("outcome_unavailable").sum()
    )
    counts["analysis_rows"] = len(data)
    counts["short_duration_analysis_rows"] = int(
        (audit["included_in_analysis"] & audit["duration_below_90s"]).sum()
    )
    counts["item_json_flagged_analysis_rows"] = int(
        (audit["included_in_analysis"] & ~audit["item_json_valid"]).sum()
    )

    for column in BASELINE_NUMERIC + CLASSICAL_NUMERIC + PARADATA_NUMERIC:
        if column in data:
            data[column] = pd.to_numeric(data[column], errors="coerce")

    for column in LOG_TRANSFORM:
        if column in data:
            data[column] = np.log1p(data[column].clip(lower=0))

    return data.reset_index(drop=True), counts, audit


def available(columns: list[str], data: pd.DataFrame) -> list[str]:
    return [column for column in columns if column in data.columns]


def build_pipeline(numeric: list[str], categorical: list[str]) -> Pipeline:
    numeric_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            ("scale", StandardScaler()),
        ]
    )
    categorical_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "onehot",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            ),
        ]
    )
    preprocess = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipe, numeric),
            ("categorical", categorical_pipe, categorical),
        ],
        remainder="drop",
    )
    return Pipeline(
        steps=[
            ("preprocess", preprocess),
            ("model", ElasticNet(max_iter=50000, random_state=20260722)),
        ]
    )


def nested_predictions(
    data: pd.DataFrame,
    numeric: list[str],
    categorical: list[str],
    seed: int,
) -> pd.DataFrame:
    features = numeric + categorical
    x = data[features]
    y = data[OUTCOME].to_numpy(dtype=float)
    outer = RepeatedKFold(n_splits=10, n_repeats=5, random_state=seed)
    records: list[dict[str, float | int]] = []
    grid = {
        "model__alpha": [0.001, 0.01, 0.1, 0.5, 1.0],
        "model__l1_ratio": [0.05, 0.25, 0.5, 0.75, 0.95],
    }

    for fold, (train, test) in enumerate(outer.split(x, y), start=1):
        search = GridSearchCV(
            build_pipeline(numeric, categorical),
            param_grid=grid,
            scoring="neg_root_mean_squared_error",
            cv=5,
            n_jobs=-1,
        )
        search.fit(x.iloc[train], y[train])
        prediction = search.predict(x.iloc[test])
        for row_index, truth, estimate in zip(test, y[test], prediction, strict=True):
            records.append(
                {
                    "participant_row": int(row_index),
                    "fold": fold,
                    "truth": float(truth),
                    "prediction": float(estimate),
                }
            )

    return pd.DataFrame.from_records(records)


def prediction_metrics(predictions: pd.DataFrame) -> dict[str, float]:
    truth = predictions["truth"]
    estimate = predictions["prediction"]
    return {
        "rmse": float(math.sqrt(mean_squared_error(truth, estimate))),
        "mae": float(mean_absolute_error(truth, estimate)),
        "r2": float(r2_score(truth, estimate)),
    }


def aggregate_squared_error(predictions: pd.DataFrame, name: str) -> pd.DataFrame:
    result = predictions.assign(
        squared_error=(predictions["truth"] - predictions["prediction"]) ** 2
    )
    return (
        result.groupby("participant_row", as_index=False)["squared_error"]
        .mean()
        .rename(columns={"squared_error": name})
    )


def bootstrap_contrast(
    left: pd.DataFrame,
    right: pd.DataFrame,
    left_name: str,
    right_name: str,
    seed: int,
    iterations: int,
) -> dict[str, float]:
    merged = left.merge(right, on="participant_row", validate="one_to_one")
    difference = merged[left_name].to_numpy() - merged[right_name].to_numpy()
    rng = np.random.default_rng(seed)
    boot = np.empty(iterations)
    for index in range(iterations):
        sample = rng.choice(difference, size=len(difference), replace=True)
        boot[index] = sample.mean()
    lower, upper = np.quantile(boot, [0.025, 0.975])
    return {
        "mean_mse_improvement": float(difference.mean()),
        "ci_95_low": float(lower),
        "ci_95_high": float(upper),
    }


def predictive_contrasts(
    predictions: dict[str, pd.DataFrame], seed: int, iterations: int
) -> dict[str, dict[str, float]]:
    """Compare paradata with the classical model, then the broader baseline."""
    errors = {
        name: aggregate_squared_error(prediction, f"{name}_squared_error")
        for name, prediction in predictions.items()
    }
    return {
        f"{left}_vs_full": bootstrap_contrast(
            errors[left],
            errors["full"],
            f"{left}_squared_error",
            "full_squared_error",
            seed + offset,
            iterations,
        )
        for offset, left in enumerate(("classical", "baseline"), start=1)
    }


def h2_robust_model(data: pd.DataFrame) -> dict[str, dict[str, float | bool]]:
    """Estimate secondary directional associations with HC3 uncertainty."""
    focal = [
        "ai_alignment_rate",
        "switched_toward_ai_rate",
        "mean_ai_confidence_shift",
    ]
    numeric = available(BASELINE_NUMERIC + focal, data)
    categorical = available(BASELINE_CATEGORICAL, data)
    x_numeric = data[numeric].copy()
    for column in numeric:
        x_numeric[column] = x_numeric[column].fillna(x_numeric[column].median())
        standard_deviation = x_numeric[column].std(ddof=0)
        if standard_deviation > 0:
            x_numeric[column] = (
                x_numeric[column] - x_numeric[column].mean()
            ) / standard_deviation
        else:
            x_numeric[column] = 0.0

    x_categorical = pd.get_dummies(
        data[categorical].fillna("[missing]").astype(str),
        drop_first=True,
        dtype=float,
    )
    design = add_constant(pd.concat([x_numeric, x_categorical], axis=1))
    fit = OLS(data[OUTCOME].astype(float), design.astype(float)).fit(cov_type="HC3")
    available_focal = [column for column in focal if column in fit.params.index]
    raw_p = [float(fit.pvalues[column]) for column in available_focal]
    adjusted = multipletests(raw_p, alpha=0.05, method="holm")[1]
    output: dict[str, dict[str, float | bool]] = {}
    for column, adjusted_p in zip(available_focal, adjusted, strict=True):
        lower, upper = fit.conf_int().loc[column]
        output[column] = {
            "standardized_coefficient": float(fit.params[column]),
            "hc3_standard_error": float(fit.bse[column]),
            "raw_p": float(fit.pvalues[column]),
            "holm_p": float(adjusted_p),
            "ci_95_low": float(lower),
            "ci_95_high": float(upper),
            "directional_support": bool(
                fit.params[column] > 0 and adjusted_p < 0.05
            ),
        }
    return output


def main() -> None:
    args = parse_args()
    output_names = [
        "input_snapshot.csv", "sample_audit.csv", "analysis_sample.csv",
        "sample_counts.json", "results.json",
        *[f"{name}_out_of_fold_predictions.csv" for name in ("baseline", "classical", "full")],
    ]
    if any(args.csv.resolve() == (args.output / name).resolve() for name in output_names):
        raise SystemExit("Choose an output directory that cannot overwrite the input file.")
    args.output.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.csv, args.output / "input_snapshot.csv")
    raw = pd.read_csv(args.csv)
    data, counts, audit = prepare_data(raw)
    audit.to_csv(args.output / "sample_audit.csv", index=False)
    data.to_csv(args.output / "analysis_sample.csv", index=False)
    (args.output / "sample_counts.json").write_text(
        json.dumps(counts, indent=2), encoding="utf-8"
    )

    if len(data) < 50:
        raise SystemExit(
            f"Only {len(data)} rows with available outcomes. Input snapshot and audit "
            "were saved; the existing N=50 modeling guard prevents fitting."
        )

    baseline_numeric = available(BASELINE_NUMERIC, data)
    baseline_categorical = available(BASELINE_CATEGORICAL, data)
    classical_numeric = baseline_numeric + available(CLASSICAL_NUMERIC, data)
    full_numeric = classical_numeric + available(PARADATA_NUMERIC, data)

    model_specs = {
        "baseline": (baseline_numeric, baseline_categorical),
        "classical": (classical_numeric, baseline_categorical),
        "full": (full_numeric, baseline_categorical),
    }
    predictions: dict[str, pd.DataFrame] = {}
    metrics: dict[str, dict[str, float]] = {}

    for name, (numeric, categorical) in model_specs.items():
        prediction = nested_predictions(data, numeric, categorical, args.seed)
        predictions[name] = prediction
        metrics[name] = prediction_metrics(prediction)
        prediction.to_csv(args.output / f"{name}_out_of_fold_predictions.csv", index=False)

    results = {
        "study_id": STUDY_ID,
        "outcome": OUTCOME,
        "sample_counts": counts,
        "model_metrics": metrics,
        "primary_comparison": "classical_vs_full",
        "secondary_comparison": "baseline_vs_full",
        "predictive_contrasts": predictive_contrasts(
            predictions, args.seed, args.bootstrap
        ),
        "h2_hc3_linear_model": h2_robust_model(data),
        "features": {
            name: {"numeric": numeric, "categorical": categorical}
            for name, (numeric, categorical) in model_specs.items()
        },
    }

    (args.output / "results.json").write_text(
        json.dumps(results, indent=2), encoding="utf-8"
    )
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
