# Dated Analysis Plan: CONFIIA Study 02

## Administrative information

- **Title:** Behavioral signals as predictors of subsequent self-reported trust
- **Project:** CONFIIA / Study 02
- **Design:** Online repeated-measures advice-taking task followed by self-report
- **Platform:** jsPsych 8, static GitHub Pages site
- **Duration:** Approximately five minutes
- **Language:** English
- **Status:** Analysis plan updated on 22 October 2026 after earlier data collection;
  no external registration is asserted by this document or its filename
- **Current task version:** `1.0.4`; earlier and new responses are analyzed together

## Research question

Do pointer, typing, and word-category features improve out-of-sample prediction of
subsequent self-reported trust beyond prior AI experience, device/input
characteristics, English comfort, demographics, baseline task behavior, and
classical advice-taking measures? The outcome is the participant's report after
the six-trial task and a one-sentence reflection.

## Design and procedure

Participants complete six two-alternative perceptual judgments. Each trial contains:

1. a 1.2-second dot-cloud comparison;
2. an initial left/right choice;
3. initial confidence from 0 to 100;
4. a pre-programmed recommendation from a simulated AI adviser;
5. a final left/right choice and final confidence; and
6. corrective feedback.

The adviser is correct on four of six fixed items. In version `1.0.4`, three items
have a correct left answer and three have a correct right answer. The adviser is
correct twice and incorrect once for each correct side. Item order is randomized
for every participant. The entry page, consent, and instructions identify the
adviser as a simulation with pre-programmed recommendations; the exact four-of-six
accuracy is explained in the debrief.

After all six trials, participants write one sentence about what guided their
response to the adviser. Raw sentence content is discarded locally after derived
features are calculated. Participants then complete the trust outcome and
background measures. They read the debrief and decide whether to send the completed
response. Version `1.0.4` posts data only after an affirmative send decision.
Declining sends no study response and still permits the configured Prolific return.

## Combined sample and recruitment target

The working target recorded on **22 October 2026** is approximately **700 completed
responses in total**: **101 earlier responses and approximately 599 new responses**.
The earlier responses remain in the combined analysis. This planning target
supersedes the earlier draft target and does not guarantee statistical significance.
Recruitment is not continued until a desired p-value or predictive result appears.
Report the achieved number of submissions, modelable outcomes, duplicates, and
audited quality flags.

Pool earlier and new complete responses across recruitment sources and versions.
No response is excluded solely because it predates `1.0.4`, comes from a different
source, or lacks newer recruitment metadata. Report counts by version and source
and the dated procedural changes alongside the pooled results. Sensitivity analyses
assess the influence of those changes without replacing the combined analysis.

## Records, completeness, and audit flags

Preserve the input snapshot and account for all imported rows in an audit. The
study invites consenting adults and collects six initial/final decisions and five
trust items. Retain one observation per known `submission_id`, keeping the earliest
server receipt and reporting repeated rows. A record without a usable primary
outcome cannot contribute to that outcome model; it remains in the audit.

Durations below 90 seconds, incomplete item records, and malformed item-level JSON
are audit flags for review. They are not automatic exclusions from the combined
analysis. Investigate identified technical problems and report any resulting
decision explicitly.

Retain completed responses irrespective of source, version, low accuracy,
disagreement with the adviser, mobile input, lack of pointer movement, missing
keyboard events, prior Study 01 participation, English comfort, or trust score.
Undefined opportunity-based indices and absent browser events are handled through
the documented preprocessing and sensitivity analyses.

## Outcome

The primary outcome is `stias_index`, the mean of three 0–6 items adapted only by
naming the target “AI adviser”:

1. I am confident in the AI adviser.
2. The AI adviser is reliable.
3. I can trust the AI adviser.

The secondary manuscript-continuity outcome is `common_trust_index`, the mean of:

1. I would trust this AI adviser to support my decision.
2. I would feel comfortable using this AI adviser to support my decisions.
3. The AI adviser is reliable.

## Predictor sets

### Baseline block

- AI familiarity
- generative-AI use frequency
- English writing comfort
- self-reported input method
- viewport bucket and coarse-pointer flag
- previous CONFIIA Study 01 participation
- age band and sex assigned at birth
- initial accuracy
- mean initial confidence
- log mean initial response time

### Classical interaction block

- final AI-alignment rate
- number of disagreement opportunities
- switch-toward-AI rate
- switch-away-from-AI rate
- RAIR and RSR when defined
- mean confidence change
- mean AI-direction confidence shift
- log mean advice-stage response time
- alignment fluency (non-aligned minus aligned advice-stage latency) when defined

### Browser-paradata block

- aggregate pointer path length
- typing first-key latency
- mean and median inter-key interval
- pause count and pause duration above 1,000 ms
- backspace count and rate
- typing duration and words per minute
- input and paste event counts
- word count
- conditional, hedge, human-agency, AI-reference, and verification word-category counts

Raw text, raw pointer trajectories, and individual key identities are not predictors
because they are not retained.

## Hypotheses and analysis

### H1: primary incremental prediction comparison

An elastic-net model with the baseline, classical interaction, and browser-paradata
blocks is compared with an elastic-net model containing baseline plus classical
interaction features. The hypothesis is that adding browser paradata improves
prediction of `stias_index` after the task and reflection.

All missing-value imputation, one-hot encoding, standardization, and hyperparameter
selection will occur inside training folds. Evaluation will use repeated 10-fold outer
cross-validation with five repeats and five-fold inner tuning. The primary contrast
is paired participant-level squared error. The three model specifications use the
same seed and outer folds. Squared errors are averaged over repeated predictions
for each participant. A paired participant bootstrap, with 5,000 resamples by
default, produces a 95% confidence interval for the mean difference. H1 is supported
if the full model has lower RMSE and the interval for `MSE_classical - MSE_full`
is entirely above zero. The result is a prediction comparison within this task.

### Secondary prediction comparison

Compare the full model with the baseline-only model using the same prediction and
bootstrap procedure. Report `MSE_baseline - MSE_full` separately from the primary
comparison. This contrast combines the contribution of classical interaction
features and browser paradata.

### H2a: behavioral alignment

In the planned linear model with HC3 robust standard errors and the baseline
block, standardized AI-alignment rate and switch-toward-AI rate will each have
positive coefficients for `stias_index`. Two-sided tests will be reported; directional
support requires a positive estimate and `p < .05` after Holm correction across H2a
and H2b coefficients.

### H2b: confidence transfer

In the same model, standardized mean AI-direction confidence shift will have a
positive coefficient for `stias_index`.

### Exploratory tests

- Repeat prediction for `common_trust_index`.
- Stratify by physical versus touchscreen input.
- Repeat after excluding participants who previously completed Study 01.
- Examine RAIR, RSR, and appropriate-reliance score as outcomes distinct from trust.
- Inspect whether typing-event missingness itself predicts trust or device type.
- Examine sensitivity to study version, recruitment source, and recorded quality
  flags while retaining the combined sample as the primary analysis.

Exploratory results are identified as such. This updated plan is not represented
as a prospectively registered plan covering data already collected.

## Multiple testing

H1 has one primary predictive contrast. H2 coefficients will be Holm-corrected as one
family. Confidence intervals, standardized effect sizes, exact sample sizes, and all
tested outcomes will be reported regardless of statistical significance.

## Missing data

Prediction models use fold-contained median imputation for numeric variables and
fold-contained most-frequent imputation for categorical variables, matching the
implemented pipeline. Numeric missingness indicators are added where applicable.
For indices undefined because there was no behavioral opportunity, this is an
operational predictor encoding; it does not recover an unobserved response.
Complete-case analyses are sensitivity checks only and do not define the main sample.

## Dated changes

**22 October 2026, version `1.0.4`:** balanced correct sides and adviser errors across
the six trials; disclosed the simulated adviser before participation; placed the
debrief and send-or-decline decision before submission; made classical-versus-full
the primary predictive comparison and baseline-versus-full secondary; updated the
combined recruitment target and quality-flag handling. Earlier and new data remain
in one pooled analysis. Report these changes, preserve `study_version`, and account
for source/version differences when interpreting and checking the pooled estimates.
