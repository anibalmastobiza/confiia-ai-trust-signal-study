# Preregistration Draft — CONFIIA Study 02

## Administrative information

- **Title:** Behavioral signals as predictors of trust in an AI adviser
- **Project:** CONFIIA / Study 02
- **Design:** Online repeated-measures advice-taking task followed by self-report
- **Platform:** jsPsych 8, static GitHub Pages site
- **Duration:** Approximately five minutes
- **Language:** English
- **Status:** Draft for review before ethics approval, pilot recruitment, or data collection

## Research question

Can behavioral signals collected before explicit trust measurement predict a
participant's later trust in an imperfect AI adviser, and do these signals improve
out-of-sample prediction beyond prior AI experience, device/input characteristics,
English comfort, demographics, and baseline task behavior?

## Design and procedure

Participants complete six two-alternative perceptual judgments. Each trial contains:

1. a 1.2-second dot-cloud comparison;
2. an initial left/right choice;
3. initial confidence from 0 to 100;
4. a pre-programmed AI recommendation;
5. a final left/right choice and final confidence; and
6. corrective feedback.

The AI is correct on four of six fixed items. Item order is randomized for every
participant. After all six trials, participants write one sentence about what guided
their response to the adviser. Raw sentence content is discarded locally after
derived features are calculated. Participants then complete the trust outcome and
background measures.

## Sample and stopping rule

Recruit until **300 complete submissions** have been received. Data collection will
not be extended or stopped based on effect size, statistical significance, model
performance, or inspection of group differences. If a technical failure affects all
participants during a documented interval, those submissions will be quarantined and
replacement recruitment may continue until 300 technically valid completions are
available. The incident and exact rule will be reported.

## Inclusion and exclusion

Include submissions that:

- record consent from an adult aged 18 or older;
- contain all six initial and final decisions;
- contain all five trust items; and
- have a unique `submission_id`.

Exclude before outcome modeling:

- duplicate `submission_id` rows, retaining the earliest server receipt;
- sessions with `total_elapsed_ms < 90000`;
- sessions missing more than one of the six item-level records; or
- sessions with malformed item-level JSON that cannot be reconciled with summary fields.

Do **not** exclude participants for low accuracy, disagreement with the AI, mobile
input, lack of pointer movement, missing keyboard events, prior completion of Study
01, English comfort, or trust score. These are modeled or used in sensitivity analyses.

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

### H1: out-of-sample predictive validity

An elastic-net model with the baseline, classical interaction, and browser-paradata
blocks will have lower out-of-sample RMSE for `stias_index` than an elastic-net model
with only the baseline block.

All missing-value imputation, one-hot encoding, standardization, and hyperparameter
selection will occur inside training folds. Evaluation will use repeated 10-fold outer
cross-validation with five repeats and five-fold inner tuning. The primary contrast
is paired participant-level squared error. A participant bootstrap over the aggregated
out-of-fold squared-error difference will produce a 95% confidence interval. H1 is
supported if the full model has lower RMSE and the confidence interval for
`MSE_baseline − MSE_full` is entirely above zero.

### H2a: behavioral alignment

In a pre-specified linear model with HC3 robust standard errors and the baseline
block, standardized AI-alignment rate and switch-toward-AI rate will each have
positive coefficients for `stias_index`. Two-sided tests will be reported; directional
support requires a positive estimate and `p < .05` after Holm correction across H2a
and H2b coefficients.

### H2b: confidence transfer

In the same model, standardized mean AI-direction confidence shift will have a
positive coefficient for `stias_index`.

### Exploratory tests

- Compare a baseline + classical model with the full model to estimate the incremental
  value of browser paradata.
- Repeat prediction for `common_trust_index`.
- Stratify by physical versus touchscreen input.
- Repeat after excluding participants who previously completed Study 01.
- Examine RAIR, RSR, and appropriate-reliance score as outcomes distinct from trust.
- Inspect whether typing-event missingness itself predicts trust or device type.

No exploratory result will be described as confirmatory.

## Multiple testing

H1 has one primary predictive contrast. H2 coefficients will be Holm-corrected as one
family. Confidence intervals, standardized effect sizes, exact sample sizes, and all
tested outcomes will be reported regardless of statistical significance.

## Missing data

Prediction models use fold-contained median imputation for numeric variables and a
fold-contained explicit missing category for categorical variables. Missingness
indicators are added for paradata that can be absent because of browser/input behavior.
Complete-case analyses are sensitivity checks only.

## Deviations

Any change made after data collection begins will be dated and labeled as a deviation.
Bug fixes that change stimuli, timing, data fields, or assignment require a new
`study_version`; affected versions will not be silently pooled.
