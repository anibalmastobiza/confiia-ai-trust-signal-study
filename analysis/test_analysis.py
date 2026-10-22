"""Synthetic-data checks for joint preparation and the paradata contrast."""

import argparse
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd
from pandas.testing import assert_frame_equal


spec = importlib.util.spec_from_file_location(
    "study_analysis", Path(__file__).with_name("analysis.py")
)
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


def example_rows(n=4):
    return pd.DataFrame({
        "study_id": [analysis.STUDY_ID] * n,
        "submission_id": [f"synthetic-{i}" for i in range(n)],
        "server_received_utc": ["2026-01-01T00:00:00Z"] * n,
        "study_version": ["1.0.0" if i % 2 else "1.2.3" for i in range(n)],
        "recruitment_source": ["community" if i % 2 else "prolific" for i in range(n)],
        "total_elapsed_ms": [120000] * n,
        "item_level_json": [json.dumps([{}] * 6)] * n,
        analysis.OUTCOME: [3.0 + (i % 3) for i in range(n)],
        "initial_accuracy": [0.5] * n,
        "typing_duration_ms": [np.nan if i % 2 else 2000.0 for i in range(n)],
    })


def predictions_with_error(n, error):
    return pd.DataFrame({
        "participant_row": np.repeat(np.arange(n), 2),
        "fold": np.tile([1, 2], n),
        "truth": np.ones(n * 2),
        "prediction": np.ones(n * 2) + error,
    })


class PreparationTests(unittest.TestCase):
    def test_joint_sample_preserves_old_versions_short_sessions_and_missing_predictors(self):
        raw = example_rows()
        raw.loc[1, "total_elapsed_ms"] = 10000
        raw.loc[1, "item_level_json"] = "unavailable in earlier export"
        original = raw.copy(deep=True)

        data, counts, audit = analysis.prepare_data(raw)

        assert_frame_equal(raw, original)
        self.assertEqual(counts["analysis_rows"], 4)
        self.assertEqual(set(data["study_version"]), {"1.0.0", "1.2.3"})
        self.assertEqual(set(data["recruitment_source"]), {"community", "prolific"})
        self.assertEqual(data["typing_duration_ms"].isna().sum(), 2)
        self.assertTrue(audit["included_in_analysis"].all())
        self.assertTrue(audit.loc[1, "duration_below_90s"])
        self.assertFalse(audit.loc[1, "item_json_valid"])

    def test_audit_retains_unusable_outcome_and_duplicates_without_collapsing_missing_ids(self):
        raw = example_rows(6)
        raw.loc[0, "submission_id"] = "duplicate"
        raw.loc[0, "server_received_utc"] = "2026-01-02T00:00:00Z"
        raw.loc[1, "submission_id"] = "duplicate"
        raw.loc[2:3, "submission_id"] = None
        raw.loc[4, analysis.OUTCOME] = np.nan
        raw.loc[5, "study_id"] = "different-study"

        data, counts, audit = analysis.prepare_data(raw)

        self.assertEqual(len(audit), 6)
        self.assertEqual(set(data["analysis_input_row"]), {2, 3, 4})
        self.assertEqual(counts["duplicate_submissions"], 1)
        self.assertEqual(audit["analysis_status"].tolist(), [
            "duplicate_submission", "included", "included", "included",
            "outcome_unavailable", "other_study",
        ])
        self.assertEqual(counts["outcome_unavailable"], 1)

    def test_missing_optional_metadata_does_not_remove_legacy_rows(self):
        raw = pd.DataFrame({"study_id": [analysis.STUDY_ID] * 2,
                            analysis.OUTCOME: [2, 4]})
        data, counts, audit = analysis.prepare_data(raw)
        self.assertEqual(len(data), 2)
        self.assertTrue(audit["duration_unavailable"].all())
        self.assertEqual(counts["duplicate_submissions"], 0)


class ContrastTests(unittest.TestCase):
    def test_no_paradata_gain_despite_a_large_gain_over_baseline(self):
        predictions = {
            "baseline": predictions_with_error(8, 3),
            "classical": predictions_with_error(8, 1),
            "full": predictions_with_error(8, 1),
        }
        result = analysis.predictive_contrasts(predictions, seed=17, iterations=50)
        self.assertEqual(result["classical_vs_full"]["mean_mse_improvement"], 0)
        self.assertEqual(result["classical_vs_full"]["ci_95_high"], 0)
        self.assertEqual(result["baseline_vs_full"]["mean_mse_improvement"], 8)

    def test_paradata_improvement_has_positive_sign(self):
        predictions = {
            "baseline": predictions_with_error(8, 3),
            "classical": predictions_with_error(8, 2),
            "full": predictions_with_error(8, 1),
        }
        result = analysis.predictive_contrasts(predictions, seed=17, iterations=50)
        self.assertEqual(result["classical_vs_full"]["mean_mse_improvement"], 3)
        self.assertEqual(result["classical_vs_full"]["ci_95_low"], 3)


class OutputTests(unittest.TestCase):
    def test_small_sample_still_saves_every_input_row_and_never_changes_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "responses.csv"
            output = Path(directory) / "outputs"
            raw = example_rows()
            raw.loc[1, analysis.OUTCOME] = np.nan
            raw.to_csv(source, index=False)
            original = source.read_bytes()
            args = argparse.Namespace(csv=source, output=output, seed=17, bootstrap=50)
            with patch.object(analysis, "parse_args", return_value=args):
                with self.assertRaisesRegex(SystemExit, "audit were saved"):
                    analysis.main()
            self.assertEqual(source.read_bytes(), original)
            self.assertEqual((output / "input_snapshot.csv").read_bytes(), original)
            self.assertEqual(len(pd.read_csv(output / "sample_audit.csv")), 4)
            self.assertEqual(len(pd.read_csv(output / "analysis_sample.csv")), 3)
            self.assertFalse((output / "results.json").exists())

    def test_results_identify_fixed_primary_and_secondary_comparisons(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "responses.csv"
            output = Path(directory) / "outputs"
            example_rows(50).to_csv(source, index=False)
            original = source.read_bytes()
            args = argparse.Namespace(csv=source, output=output, seed=17, bootstrap=50)
            predictions = [predictions_with_error(50, error) for error in (3, 1, 1)]
            with patch.object(analysis, "parse_args", return_value=args), \
                 patch.object(analysis, "nested_predictions", side_effect=predictions), \
                 patch.object(analysis, "h2_robust_model", return_value={}), \
                 contextlib.redirect_stdout(io.StringIO()):
                analysis.main()
            result = json.loads((output / "results.json").read_text())
            self.assertEqual(result["primary_comparison"], "classical_vs_full")
            self.assertEqual(result["secondary_comparison"], "baseline_vs_full")
            self.assertEqual(result["predictive_contrasts"]["classical_vs_full"]["mean_mse_improvement"], 0)
            self.assertNotIn("h1_baseline_vs_full", result)
            self.assertEqual(source.read_bytes(), original)

    def test_refuses_to_overwrite_an_input_named_like_an_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "analysis_sample.csv"
            example_rows().to_csv(source, index=False)
            original = source.read_bytes()
            args = argparse.Namespace(csv=source, output=Path(directory), seed=17, bootstrap=50)
            with patch.object(analysis, "parse_args", return_value=args):
                with self.assertRaisesRegex(SystemExit, "cannot overwrite"):
                    analysis.main()
            self.assertEqual(source.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
