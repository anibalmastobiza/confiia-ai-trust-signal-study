# CONFIIA / Study 02 — Behavioral Signals of Trust in AI

An English-language, five-minute jsPsych study testing whether behavioral signals
recorded before explicit trust measurement predict trust in an imperfect AI adviser.
It is designed as the companion to
[CONFIIA Study 01](https://anibalmastobiza.github.io/confiia-ai-trust-framing-study/)
for a single scientific manuscript.

## Manuscript logic

- **Study 01** estimates a causal framing effect: whether logically equivalent gain
  and loss descriptions change trust in medical AI.
- **Study 02** tests predictive and convergent validity: whether advice uptake,
  confidence updating, response latency, and privacy-preserving interaction paradata
  anticipate later self-reported trust.

The pairing separates *what changes trust* from *how trust manifests during use*.

## Participant journey

1. Consent to an anonymous research pilot.
2. Complete six brief dot-comparison trials.
3. Give an initial choice and confidence rating on every trial.
4. See an imperfect AI recommendation, make a final choice, and receive feedback.
5. Write one short sentence explaining what guided advice use.
6. Complete a five-item trust page and brief background measures.
7. Receive an immediate debrief and anonymous completion code.

The AI is pre-programmed and correct on four of six trials. It is not a live model.

## Measures

The primary outcome is the three-item Short Trust in Automation Scale (S-TIAS),
scored 0–6. A second three-item index mirrors the trust, comfort, and reliability
constructs used in Study 01.

Pre-outcome predictors include:

- initial and final accuracy;
- final agreement with AI advice;
- switching toward or away from advice;
- relative AI reliance (RAIR) and relative self-reliance (RSR);
- initial and final confidence and AI-direction confidence change;
- choice and advice-stage response time;
- aggregate pointer path length and reversals;
- typing latency, inter-key intervals, pauses, backspace rate, and words per minute; and
- small, pre-defined counts of conditional, hedge, agency, AI-reference, and
  verification words.

## Privacy design

The study requests no name, email, camera, microphone, location, or raw user-agent
string. The one-sentence response is analyzed in the participant's browser and then
replaced with a discard marker before jsPsych data are serialized. Raw pointer
coordinates and individual key identities are never sent. Only aggregate timing,
movement, edit, and word-category summaries are retained.

The consent copy is a research-pilot placeholder, not a claim of ethics approval.
Replace it with institution-approved language before recruitment.

## Research materials

- [`research/RESEARCH_BRIEF.md`](research/RESEARCH_BRIEF.md) synthesizes the literature,
  explains the gap, and positions both studies in one manuscript.
- [`research/PREREGISTRATION.md`](research/PREREGISTRATION.md) defines hypotheses,
  stopping, exclusions, predictors, and the out-of-sample analysis.
- [`research/DATA_DICTIONARY.md`](research/DATA_DICTIONARY.md) documents every stored
  field and the privacy boundary.
- [`analysis/analysis.py`](analysis/analysis.py) implements nested repeated
  cross-validation, paired prediction-error bootstraps, and the preregistered HC3
  association model.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run typecheck
npm test
```

Copy `.env.example` to `.env.local` and set `VITE_DATA_ENDPOINT` to test data
submission against a Google Apps Script deployment. Without that variable, the study
runs normally but keeps data local and tells the participant that no spreadsheet was
connected.

## Google Sheets collection

The collector in [`google-apps-script/Code.gs`](google-apps-script/Code.gs) appends
Study 02 responses to a separate `Study02_Responses` tab in the same private workbook
used by Study 01. It validates `study_id`, rejects duplicate `submission_id` values,
serializes concurrent writes with a script lock, and neutralizes spreadsheet formulas.

Deployment procedure:

1. Create a standalone Google Apps Script project in the researcher's Google account.
2. Paste `google-apps-script/Code.gs` into the project.
3. Run `setupResponses` once and authorize access. Confirm that the
   `Study02_Responses` tab appears with the expected headers.
4. Deploy as a **Web app**, execute as the researcher, and allow access to **Anyone**.
   The Sheet remains private; “Anyone” applies only to posting to the collector URL.
5. Copy the `/exec` URL.
6. For local work, place it in `.env.local` as `VITE_DATA_ENDPOINT`.
7. For GitHub Pages, create a repository Actions variable named
   `VITE_DATA_ENDPOINT` containing the same URL.
8. Complete one test submission and verify that exactly one row appears before
   recruiting participants.

The browser uses a `no-cors` request because Apps Script web apps do not expose a
normal cross-origin JSON response. “Response sent” confirms dispatch, not a readable
server acknowledgement. Monitor the Sheet during recruitment and retain participant
downloads as the fallback path.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` tests and builds the project on
every push to `main`, then deploys `dist` with GitHub Pages. The Vite base path is:

```text
/confiia-ai-trust-signal-study/
```

The intended public URL is:

```text
https://anibalmastobiza.github.io/confiia-ai-trust-signal-study/
```

In the GitHub repository settings, Pages must use **GitHub Actions** as its source.

## Pre-launch checklist

- Obtain ethics/data-protection approval and replace placeholder consent language.
- Freeze and register `research/PREREGISTRATION.md` before inspecting outcomes.
- Confirm the Google Apps Script endpoint and one-row test submission.
- Confirm Study 01 and Study 02 recruitment overlap policy.
- Test physical keyboard/mouse and touchscreen/on-screen-keyboard paths.
- Run a timed pilot and verify median completion remains near five minutes.
- Confirm the debrief accurately states four correct AI recommendations out of six.
- Tag the frozen release and preserve `study_version` in all exported data.

Built against the official [jsPsych 8 documentation](https://www.jspsych.org/latest/).
