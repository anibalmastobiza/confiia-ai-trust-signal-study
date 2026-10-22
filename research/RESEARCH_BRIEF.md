# CONFIIA Study 02: Behavioral Signals and Self-Reported Trust

## Executive summary

CONFIIA Study 02 is a five-minute, browser-based study asking whether interaction
behavior and browser paradata predict a subsequent self-report within a short
advice task. Participants make six perceptual judgments, see a simulated adviser's
pre-programmed recommendation, and may revise each judgment. They then write one
sentence about their decisions before completing the three-item Short Trust in
Automation Scale (S-TIAS) plus two items aligned with CONFIIA Study 01.

The primary question is whether aggregate pointer movement, typing, and
word-category features improve out-of-sample prediction beyond background
variables and classical advice-taking measures. The outcome is self-reported trust
after both the task and the reflection. The study collects no webcam recording,
microphone recording, raw key log, raw pointer trajectory, or retained free text.

This document was updated on 22 October 2026 to describe version `1.0.4` and the
combined analysis of earlier and newly collected responses. The working target is
approximately 700 complete responses, including 101 earlier responses and
approximately 599 new responses. This target does not guarantee a significant
predictive improvement.

## Relationship to CONFIIA Study 01

The two studies answer different but mutually informative questions for one
manuscript.

| Manuscript role | Study 01: one-sentence framing | Study 02: behavioral signals |
| --- | --- | --- |
| Core question | Does an equivalent gain versus loss frame causally change trust in medical AI? | Does browser paradata improve prediction of later self-reported trust beyond classical advice taking? |
| Design | Randomized between-subjects framing experiment | Repeated advice-taking task followed by trust measurement |
| Primary contribution | Causal effect of communication | Incremental prediction of task-specific self-reported trust |
| Shared construct | Trust, comfort, and perceived reliability | S-TIAS plus adapted trust, comfort, and reliability items |
| Shared implementation | English, mobile/desktop, jsPsych 8, GitHub Pages, Google Sheets; Prolific identifiers where supplied | English, mobile/desktop, jsPsych 8, GitHub Pages, Google Sheets; Prolific identifiers where supplied |

Study 01 estimates the effect of wording on reported trust. Study 02 evaluates
whether measured behavior adds predictive information about a later self-report.
These contributions concern different tasks and support separate inferences.

## What the literature establishes

### 1. Trust and reliance are related, but they are not interchangeable

Trust in automation is commonly treated as an attitude that guides reliance under
uncertainty, while reliance is an observable behavior also shaped by self-confidence,
risk, workload, and task characteristics. Lee and See's framework and Hoff and
Bashir's evidence synthesis both emphasize calibration rather than maximizing
trust. Empirical work has accordingly measured both self-report and automation use.

This distinction matters for prediction. A person can follow correct advice for
instrumental reasons without reporting high trust, or report trust while failing to
discriminate correct from incorrect advice. Study 02 therefore preserves separate
measures of:

- final agreement with the AI;
- switching toward the AI when the initial answer disagrees;
- switching away from the AI;
- relative AI reliance (RAIR) and relative self-reliance (RSR); and
- self-reported trust.

The outcome is the three-item S-TIAS (confidence in, reliability of, and trust in
the AI adviser). McGrath and colleagues validated this short form across contemporary
AI applications and reported excellent internal consistency and sensitivity to
performance manipulations.

### 2. Advice taking and confidence updating are established behavioral windows

Yin, Vaughan, and Wallach showed that both stated and observed model accuracy affect
behavioral revision and self-reported trust. The judge–advisor literature formalizes
revision toward advice as a response shift or weight-of-advice measure. More recent
human–AI work distinguishes following correct advice from rejecting incorrect advice
because simple agreement can conceal over-reliance.

Requiring an initial answer before revealing AI advice is also a light cognitive
forcing function. Buçinca, Malaya, and Gajos found that forcing an initial judgment
can reduce over-reliance, although more effortful designs can receive worse subjective
ratings. Study 02 uses the initial-then-final sequence because it identifies change
attributable to advice while remaining short enough for an online pilot.

### 3. Physiological trust sensing is promising but difficult to scale online

Laboratory studies have classified trust states with EEG, fNIRS, gaze, and other
physiological measurements. These methods can capture moment-to-moment change but
usually require specialized equipment, controlled tasks, and relatively small
samples. A 2025 systematic review of eye tracking and automation trust found a
negative gaze–trust relationship in only about half of 22 reviewed studies; the
relationship did not appear robust across metrics and designs. This makes webcam
gaze a poor primary measure for a five-minute cross-device study, in addition to its
privacy and consent burden.

### 4. Browser paradata can reveal effort and difficulty

Mouse movement can improve prediction of web-survey response difficulty beyond
response time alone. Typing research likewise shows that inter-key intervals,
pauses, and backspace use are sensitive to fatigue and cognitive effort. Importantly,
privacy-preserving typing studies can retain timing summaries while avoiding the
content of what people type.

A June 2026 preprint directly studying human–LLM prompting found that harder tasks
produced slower typing, more pauses, and more keystrokes across desktop and mobile,
but those features did **not** predict perceived output usefulness in its small
sample. This is useful boundary evidence: typing dynamics may index effort without
necessarily indexing trust or evaluation. Study 02 treats their incremental value
as an empirical question about prediction of a later report in this task.

## The research gap

The literature contains strong traditions on self-reported trust, advice uptake,
and laboratory trust sensing. It also shows that browser interaction traces can
index response difficulty. We did not identify a short, cross-device online study
that asks whether privacy-preserving typing, pointer, latency, and confidence-update
features add out-of-sample prediction of AI trust beyond background variables and
classical advice-taking measures.

The proposed contribution is **incremental predictive validity** beyond classical
advice-taking measures, evaluated on held-out observations.

## Study design

1. Adults read that the adviser is simulated and consent to collection of choices,
   timings, aggregate movement, and derived typing/text features. Prolific entries
   also supply the identifiers described in the consent information.
2. On each of six trials, two dot clouds appear for 1.2 seconds.
3. The participant chooses which side has more dots and rates initial confidence.
4. The simulated adviser recommends a side. The participant makes a final choice
   and final confidence judgment.
5. Feedback reveals the correct side and whether the adviser was correct. The adviser
   is pre-programmed to be correct on four of six trials; order is randomized.
   Version `1.0.4` has three correct left answers and three correct right answers,
   with two correct adviser recommendations and one error for each correct side.
6. Before any trust scale, the participant writes one sentence explaining what guided
   their use or rejection of advice. The browser derives timing and pre-defined word
   category counts, then replaces the sentence with a discard marker.
7. Participants complete S-TIAS, two manuscript-continuity items, and brief covariates.
8. Participants read the debrief and choose whether to send the response. Declining
   sends no study response and leaves the configured Prolific return available.

## Hypotheses

**H1: Incremental predictive validity.** Compare an elastic-net model with baseline,
classical advice-taking, and browser-paradata features against a model with baseline
and classical advice-taking features. The hypothesis is that adding browser
paradata reduces out-of-sample prediction error for post-task, post-reflection
S-TIAS. Preprocessing and tuning occur within training folds.

**H2a: Behavioral alignment.** Higher final AI-alignment and a higher rate of
switching toward AI advice will be associated with higher S-TIAS scores.

**H2b: Confidence transfer.** A larger confidence change in the direction of the
AI-supported final answer will be associated with higher S-TIAS scores.

**Secondary predictive comparison.** Compare the full model with the baseline-only
model to quantify the combined contribution of classical interaction measures and
browser paradata. Individual paradata coefficients do not have directional
hypotheses: they can reflect effort, device constraints, English production, and
uncertainty as well as variation associated with the later trust report.

Both comparisons use the same repeated outer cross-validation folds. Paired
participant-level squared-error differences, aggregated across repeats, are
summarized with bootstrap intervals. The main dataset combines complete responses
across recruitment sources and versions; source and version alone do not trigger
exclusion. The dated analysis plan describes audit flags and sensitivity analyses.

## Why this design is appropriately cautious

- Behavioral and text-derived predictors are collected before the trust items;
  background covariates follow the trust page. Trust responses are not used to
  construct the behavioral predictors.
- The adviser uses fixed recommendations. The balanced version `1.0.4` and earlier
  versions are documented in the combined dataset; no changing model API supplies
  the recommendations.
- Raw free text, raw pointer paths, and individual key identities are not sent.
- Device/input method and English comfort are measured because they are plausible
  confounds for typing dynamics.
- Prediction is evaluated out of sample with all preprocessing performed inside
  training folds.
- Predictive results are interpreted as associations with subsequent self-reported
  trust in the task and reflection used here.

## Limitations to report

1. Six trials support a short task but make participant-level RAIR and RSR noisy;
   these measures are secondary.
2. A perceptual dot task isolates advice taking but has lower ecological validity
   than medical, workplace, or generative-AI decisions.
3. Feedback fixes observed accuracy at four of six trials, so the study estimates
   individual differences under one reliability regime rather than an accuracy dose–response.
4. Pointer summaries are not directly comparable between touch and mouse input;
   input method must be modeled and stratified sensitivity analyses reported.
5. Keystroke events from mobile virtual keyboards vary by browser. Missingness is
   informative and should be reported rather than silently treated as zero.
6. The one-sentence reflection may itself influence subsequent trust. Because every
   participant receives it, it does not invalidate prediction but narrows the outcome
   to post-reflection trust.
7. Self-reported trust is situation-specific and should not be generalized to all AI.
8. Earlier and later responses differ in trial balance and the timing of simulation
   disclosure. The combined estimate includes that procedural variation. Version
   and source counts and sensitivity analyses must accompany its interpretation.
9. The analysis plan was updated after earlier data collection. The file named
   `PREREGISTRATION.md` records that date and does not establish external registration
   or prospective specification for the earlier observations.

## Selected references

- Buçinca, Z., Malaya, M. B., & Gajos, K. Z. (2021). [To Trust or to Think: Cognitive Forcing Functions Can Reduce Overreliance on AI in AI-assisted Decision-making](https://doi.org/10.1145/3449287). *Proceedings of the ACM on Human-Computer Interaction, 5*(CSCW1), Article 188.
- Hoff, K. A., & Bashir, M. (2015). [Trust in automation: Integrating empirical evidence on factors that influence trust](https://doi.org/10.1177/0018720814547570). *Human Factors, 57*(3), 407–434.
- Horwitz, R., Kreuter, F., & Conrad, F. (2017). [Using mouse movements to predict web survey response difficulty](https://doi.org/10.1177/0894439315626360). *Social Science Computer Review, 35*(3), 388–405.
- Lee, J. D., & See, K. A. (2004). [Trust in automation: Designing for appropriate reliance](https://doi.org/10.1518/hfes.46.1.50_30392). *Human Factors, 46*(1), 50–80.
- Lee, J. R., & Gutzwiller, R. S. (2025). [Do the eyes have it? A review of using eye tracking for automation trust measurement](https://doi.org/10.1177/00187208251348395). *Human Factors, 67*(12), 1290–1311.
- McGrath, M. J., et al. (2025). [Measuring trust in artificial intelligence: Validation of an established scale and its short form](https://doi.org/10.3389/frai.2025.1582880). *Frontiers in Artificial Intelligence, 8*, 1582880.
- Schemmer, M., Kühl, N., Benz, C., Bartos, A., & Satzger, G. (2023). [Appropriate reliance on AI advice: Conceptualization and the effect of explanations](https://doi.org/10.1145/3581641.3584066). *IUI 2023*.
- Schütz, L., Cherif, Y., Sayffaerth, C., Weber, T., & Chiossi, F. (2026). [Typing behavior in human–LLM interaction: Keystroke dynamics reveal cognitive effort during prompting](https://arxiv.org/abs/2606.28090). Preprint.
- Shafti, A., Derks, V., Kay, H., & Faisal, A. A. (2022). [The response shift paradigm to quantify human trust in AI recommendations](https://arxiv.org/abs/2202.08979). Preprint.
- van der Linden, D., et al. (2020). [Dynamics in typewriting performance reflect mental fatigue during real-life office work](https://doi.org/10.1371/journal.pone.0239984). *PLOS ONE, 15*(10), e0239984.
- Yin, M., Vaughan, J. W., & Wallach, H. (2019). [Understanding the effect of accuracy on trust in machine learning models](https://doi.org/10.1145/3290605.3300509). *CHI 2019*.

The literature search was last updated on 22 July 2026.
