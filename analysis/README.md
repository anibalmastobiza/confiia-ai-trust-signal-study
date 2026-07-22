# Analysis

Export the `Study02_Responses` tab from Google Sheets as CSV, then run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r analysis/requirements.txt
python analysis/analysis.py responses.csv --output analysis-results
```

The script applies the preregistered exclusions, runs nested repeated
cross-validation for baseline, classical-interaction, and full behavioral models,
bootstraps paired prediction-error differences, and writes machine-readable JSON and
an analysis-sample CSV. It does not overwrite the source export.

Run this script only after freezing the preregistration and the analysis environment.
