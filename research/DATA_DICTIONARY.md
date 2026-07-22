# Data Dictionary — CONFIIA Study 02

The Google Sheet contains one row per completed submission. jsPsych downloads contain
one row per trial. Scale responses are stored as integers from 0 to 6.

## Identifiers and session metadata

| Field | Type | Meaning |
| --- | --- | --- |
| `server_received_utc` | ISO timestamp | Apps Script receipt time |
| `study_id` | string | Fixed value `confiia_ai_trust_behavioral_signals` |
| `study_version` | string | Version of stimuli and scoring |
| `submission_id` | UUID | Idempotency key used to reject duplicate writes |
| `participant_id` | string | Anonymous participant-facing code |
| `jspsych_version` | string | Runtime jsPsych version |
| `session_started_utc` | ISO timestamp | Browser start time |
| `session_completed_utc` | ISO timestamp | Browser completion time |
| `total_elapsed_ms` | integer | Wall-clock session duration |
| `viewport_bucket` | category | Coarse width category; exact dimensions are not stored |
| `coarse_pointer` | boolean | Browser media-query result for coarse pointing |
| `trial_order` | string | Pipe-delimited item order |
| `recruitment_id` | UUID/string or blank | Anonymous allocation ID received from the unified recruitment router (`rid`) |
| `recruitment_source` | string or blank | Recruitment source label; unified route uses `confiia-unified-recruitment` |
| `assigned_study` | string or blank | Router arm (`study02` for correctly routed unified entries) |

## Task performance and advice taking

| Field | Range | Meaning |
| --- | --- | --- |
| `initial_accuracy` | 0–1 | Proportion correct before AI advice |
| `final_accuracy` | 0–1 | Proportion correct after AI advice |
| `ai_alignment_rate` | 0–1 | Proportion of final choices matching AI advice |
| `disagreement_trials` | 0–6 | Trials where initial choice differed from AI advice |
| `switched_toward_ai_rate` | 0–1 or blank | Switches to AI divided by disagreement opportunities |
| `switched_away_ai_rate` | 0–1 or blank | Switches away divided by initial-agreement opportunities |
| `rair` | 0–1 or blank | Follow correct AI when initial human answer was wrong |
| `rsr` | 0–1 or blank | Retain correct human answer when AI was wrong |
| `appropriate_reliance_score` | 0–1 or blank | Mean of available RAIR and RSR |
| `mean_initial_confidence` | 0–100 | Mean confidence before advice |
| `mean_final_confidence` | 0–100 | Mean confidence after advice |
| `mean_confidence_change` | −100–100 | Final minus initial confidence |
| `mean_ai_confidence_shift` | −100–100 | Confidence change signed toward AI alignment |
| `mean_initial_rt_ms` | milliseconds | Mean initial-choice latency |
| `mean_advice_rt_ms` | milliseconds | Mean advice-page latency |
| `ai_alignment_fluency_ms` | milliseconds or blank | Mean non-aligned minus aligned advice latency |
| `item_level_json` | JSON | Six compact item records with choices, accuracy, confidence, latency, and aggregate pointer features |

## Privacy-preserving pointer and typing features

| Field | Meaning |
| --- | --- |
| `mean_pointer_path_px` | Mean aggregate path length across recorded task pages; no coordinates are retained |
| `typing_key_count` | Count of non-modifier keydown events; key identities are not retained |
| `typing_printable_count` | Count of printable key events |
| `typing_backspace_count` | Backspace/delete event count |
| `typing_backspace_rate` | Backspace/delete count divided by key count |
| `typing_first_key_latency_ms` | Time from prompt display to first recorded key |
| `typing_mean_iki_ms` | Mean inter-key interval below 10 seconds |
| `typing_median_iki_ms` | Median inter-key interval below 10 seconds |
| `typing_pause_count_1000ms` | Number of inter-key intervals at least one second |
| `typing_pause_time_ms` | Sum of inter-key intervals at least one second |
| `typing_duration_ms` | First-to-last key interval |
| `typing_wpm` | Derived words per minute |
| `typing_input_events` | Browser input-event count; useful on virtual keyboards |
| `typing_paste_events` | Paste-event count |

## Derived linguistic features

The raw sentence is replaced with `[discarded after local extraction]` before jsPsych
data are serialized. Only these counts remain:

| Field | Pre-defined category examples |
| --- | --- |
| `text_word_count` | All English word-like tokens |
| `text_conditional_count` | if, unless, when, whether, depends |
| `text_hedge_count` | maybe, perhaps, probably, uncertain, seems |
| `text_human_agency_count` | I, my, human, judgment, decide |
| `text_ai_reference_count` | AI, algorithm, model, system, adviser |
| `text_verification_count` | check, verify, evidence, accuracy, mistake, wrong |

These small dictionaries are theory-guided features, not validated psychological
scales. They must be reported as exploratory.

## Trust outcomes

| Field | Range | Meaning |
| --- | --- | --- |
| `stias_confident` | 0–6 | “I am confident in the AI adviser.” |
| `stias_reliable` | 0–6 | “The AI adviser is reliable.” |
| `stias_trust` | 0–6 | “I can trust the AI adviser.” |
| `stias_index` | 0–6 | Mean of the three S-TIAS items |
| `common_primary_trust` | 0–6 | Trust adviser to support own decision |
| `common_comfort` | 0–6 | Comfort using adviser for decisions |
| `common_trust_index` | 0–6 | Mean of primary trust, comfort, and reliability |

## Covariates

`ai_familiarity`, `ai_use_frequency`, `english_comfort`, `input_method`,
`previous_confiia_study`, `age_band`, and `sex_assigned_at_birth` contain the displayed
response labels. Prefer-not-to-answer responses are valid categories and must not be
recoded as missing without reporting that choice.

## Response-time fields

`consent_rt_ms`, `reasoning_rt_ms`, `trust_rt_ms`, and `background_rt_ms` are jsPsych
screen-level response times. They are quality-control variables, not primary predictors.
