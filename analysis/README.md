# Analysis

Export the `Study02_Responses` tab from Google Sheets as CSV, then run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r analysis/requirements.txt
python analysis/analysis.py responses.csv --output analysis-results
```

The primary predictive comparison is `classical_vs_full`: whether adding paradata
improves prediction beyond background measures and classical interaction measures.
`baseline_vs_full` is secondary. The primary comparison is fixed before fitting
and is not selected from the observed results. These labels describe the analysis
plan; this repository does not establish that it was externally preregistered.

All available previous and new responses are analyzed jointly. Recruitment source
and study version remain in the data for traceability. They do not split the sample,
determine eligibility, or enter the models as new covariates.

## Sample and preservation

The script saves a byte-for-byte `input_snapshot.csv` before preparation and never
overwrites the input export. `sample_audit.csv` contains one row per input row,
identified by `analysis_input_row`, with inclusion status and diagnostic flags.
`sample_counts.json` summarizes these decisions. These outputs and
`analysis_sample.csv` are saved even when the existing N=50 modeling guard stops
fitting. N=50 is not a claim of adequate statistical power.

For modeling, rows must belong to Study 02 and have a finite numeric `stias_index`.
Known repeated `submission_id` values are represented once, retaining the earliest
server timestamp, with input order breaking ties. Missing submission IDs are not
treated as duplicates. All duplicate rows remain in the snapshot and audit.
Identifiers do not establish that different sessions belong to independent people.

The former duration cutoff of 90 seconds and the item-JSON requirement are now
diagnostic flags, not automatic exclusions. Previous versions, any recruitment
source, missing predictor values, and unavailable metadata do not automatically
remove a row with an available outcome. Rows with unavailable outcomes remain in
the audit but cannot enter supervised prediction; outcomes are never imputed.
The script does not infer consent or identify undocumented test submissions.

## Models and comparisons

The three elastic-net models use the same seeded outer splits: 10 folds repeated
five times, with five-fold tuning inside each training split. Numeric median
coding with missingness indicators, categorical coding, and scaling are fitted
within training folds. Undefined behavioral ratios and absent events remain
missing in the saved analysis sample. Internal numeric replacements allow a
prediction; they do not represent recovered measurements or additional people.
The existing secondary HC3 association model retains its single-median coding;
the script does not perform multiple imputation.

For each participant row, squared errors are averaged across outer repetitions.
The paired bootstrap then resamples these participant-level error differences.
A positive `mean_mse_improvement` means the full model has lower error than the
comparison model. The bootstrap intervals describe the existing out-of-fold
predictions; they do not refit the entire cross-validation procedure.

`results.json` identifies `primary_comparison: classical_vs_full` and
`secondary_comparison: baseline_vs_full`. Their estimates are under
`predictive_contrasts`. The script also writes out-of-fold predictions, model
metrics, feature lists, and secondary HC3 associations with Holm adjustment.
No observed outcome or significance threshold changes the primary comparison.

Freeze this plan and the analysis environment before running the study analysis.
To check the preparation and contrast logic using synthetic data only:

```bash
python -m unittest discover -s analysis -p 'test_*.py'
```
