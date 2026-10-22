# CONFIIA / Study 02: Behavioral Signals and Self-Reported Trust

An English-language, five-minute jsPsych study testing whether interaction behavior
and browser paradata predict subsequent self-reported trust within a short advice
task. The adviser is explicitly introduced as a simulation with pre-programmed
recommendations. Trust is measured after six trials and a one-sentence reflection.
It is designed as the companion to
[CONFIIA Study 01](https://anibalmastobiza.github.io/confiia-ai-trust-framing-study/)
for a single scientific manuscript.

## Manuscript logic

- **Study 01** estimates a causal framing effect: whether logically equivalent gain
  and loss descriptions change trust in medical AI.
- **Study 02** tests whether pointer, typing, and word-category features improve
  out-of-sample prediction of later self-reported trust beyond background variables
  and classical advice-taking measures.

The manuscript combines an experimental communication contrast with a predictive
analysis of self-reported trust in a separate task.

## Participant journey

1. Read the study information and consent to a task with a simulated AI adviser.
2. Complete six brief dot-comparison trials.
3. Give an initial choice and confidence rating on every trial.
4. See a pre-programmed recommendation, make a final choice, and receive feedback.
5. Write one short sentence explaining what guided advice use.
6. Complete a five-item trust page and brief background measures.
7. Read the debrief and choose whether to send the completed response.
8. Receive an internally generated study code and, for the configured Prolific
   advertisement, the return link. Declining submission sends no study response.

The adviser is correct on four of six trials. In version `1.0.4`, the correct answer
is left on three trials and right on three trials. Adviser errors occur once for
each correct side; correct recommendations occur twice on each side. Trial order is
randomized. The simulation is disclosed before participants begin.

## Combined recruitment and analysis

The analysis uses earlier and newly collected eligible responses together, including
all recruitment sources and study versions. Source or version alone is not an
exclusion criterion. As documented on 22 October 2026, the working target is
approximately **700 completed responses in total**, comprising **101 earlier
responses plus approximately 599 new responses**. This target is a planning value;
it does not guarantee a significant effect. The earlier records remain part of the
combined study. Version and source counts, the changes in `1.0.4`, and sensitivity
analyses accompany the pooled results.

The primary predictive contrast is full versus baseline plus classical interaction
features. Full versus baseline alone is secondary. These comparisons concern the
later self-report in this task, including its preceding reflection. The dated plan
in `research/PREREGISTRATION.md` documents the update; its filename does not assert
an external registration.

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

Entries from Prolific also retain the participant, study and session identifiers
provided in the entry URL. These are pseudonymous identifiers used to match a
submission for payment. They are separate from the internally generated study code.

The consent copy is a research-pilot placeholder, not a claim of ethics approval.
Replace it with institution-approved language before recruitment.

## Research materials

- [`research/RESEARCH_BRIEF.md`](research/RESEARCH_BRIEF.md) synthesizes the literature,
  explains the gap, and positions both studies in one manuscript.
- [`research/PREREGISTRATION.md`](research/PREREGISTRATION.md) defines hypotheses,
  the dated analysis plan, target sample, exclusions, predictors, and out-of-sample
  comparisons.
- [`research/DATA_DICTIONARY.md`](research/DATA_DICTIONARY.md) documents every stored
  field and the privacy boundary.
- [`analysis/analysis.py`](analysis/analysis.py) implements nested repeated
  cross-validation, paired prediction-error bootstraps, and the planned HC3
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
used by Study 01. It also accepts anonymous allocations from the unified recruitment
router and stores them in `Recruitment_Assignments`, deduplicated by `assignment_id`.
It validates `study_id`, serializes concurrent writes with a script lock, and
neutralizes spreadsheet formulas.

When entry comes through the unified recruitment page, the completion row retains
the anonymous `recruitment_id`, source label, and assigned arm. This permits an
allocation-to-completion audit without names, email addresses, or cross-study
response linkage.

Deployment procedure:

1. Create a standalone Google Apps Script project in the researcher's Google account.
2. Paste `google-apps-script/Code.gs` into the project.
3. Run `setupResponses` and `setupRecruitmentAssignments` once and authorize access.
   Confirm that the `Study02_Responses` and `Recruitment_Assignments` tabs appear with
   the expected headers.
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

## Independent Prolific study

For the separate Study 02 advertisement, use this direct study URL with Prolific's
URL-parameter placeholders:

```text
https://anibalmastobiza.github.io/confiia-ai-trust-signal-study/?source=prolific&PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
```

The participant-facing Prolific link substitutes these placeholders. The study
captures them once at session start as `prolific_pid`, `prolific_study_id` and
`prolific_session_id`. Each value is URL-decoded and limited to 128 characters.
They are included in the completion payload and in every jsPsych JSON/CSV record.
The existing `participant_id`, `study_id` and `submission_id` retain their meanings.
Without these parameters, the three fields are empty. A nonempty `source` is preserved
when provided; otherwise a nonempty `PROLIFIC_PID` sets `recruitment_source` to `prolific`.
The unified router and its `rid`, `source` and `assigned_study` fields remain supported.

Version 1.0.2 appends the three Prolific columns at the end of `Study02_Responses`.
Existing rows and columns are preserved; older payloads leave the new cells empty.
Update the Apps Script project with the revised `google-apps-script/Code.gs` and
redeploy its existing web app using a **new version**. Publishing the website alone
does not update the collector. `setupResponses` or the first accepted submission
adds the headers after this update.

Version 1.0.3 adds a manual **Return to Prolific** button after the debrief and
downloads. It appears only when the metadata captured at session start contains
a nonempty `PROLIFIC_PID` and the exact Prolific `STUDY_ID`
`6ad9d559c9dea36ec4961271`. Its completion code is `C15E3TNE`, and its return URL is
`https://app.prolific.com/submissions/complete?cc=C15E3TNE`. The `CONFIIA2-...` study
code remains a separate internal reference. The page does not redirect automatically.
The return remains available if sending fails, alongside the warning and local
CSV/JSON downloads. A successful browser dispatch does not confirm that the
spreadsheet received or stored the response.

Version `1.0.4` displays the debrief and a send-or-decline decision before any
completed response is posted. Only the affirmative send action initiates the POST.
The completion page also supports returning to Prolific after declining submission.
The updated trial balance and disclosure are recorded under the same study with a
new `study_version`; older responses remain in the combined analysis.

When duplicating the Prolific advertisement, obtain the new advertisement's study
ID, completion code and return URL from Prolific. Update `PROLIFIC_STUDY_ID`,
`PROLIFIC_COMPLETION_CODE` and `PROLIFIC_RETURN_URL` together in
[`app/completion.tsx`](app/completion.tsx), update the expected values in
[`tests/completion.test.mjs`](tests/completion.test.mjs), run the project checks,
and deploy the website before recruitment. Verify a preview with the new ID and
confirm that entries for other IDs do not show the return button. The collector
does not need a change for this completion configuration.

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

## Recruitment flyer

The English A4 recruitment poster is available at
[`output/pdf/recruitment_flyer_confiia_ai_trust_signals_en.pdf`](output/pdf/recruitment_flyer_confiia_ai_trust_signals_en.pdf).
Its QR code and printed link point to the GitHub Pages URL above. To regenerate it:

```bash
python scripts/generate_recruitment_flyer.py
```

The poster mirrors the visual language of CONFIIA Study 01 while making Study 02's
five-minute behavioral task and privacy boundary explicit: no camera, no microphone,
and no storage of the participant's raw typed sentence.

## Pre-launch checklist

- Obtain ethics/data-protection approval and replace placeholder consent language.
- Preserve the dated analysis plan and report changes alongside the combined data.
- Confirm the Google Apps Script endpoint and one-row test submission.
- Confirm Study 01 and Study 02 recruitment overlap policy.
- Test physical keyboard/mouse and touchscreen/on-screen-keyboard paths.
- Run a timed pilot and verify median completion remains near five minutes.
- Confirm the debrief accurately states four correct AI recommendations out of six.
- Confirm the simulation is disclosed at entry and that declining after the debrief
  does not send a response.
- Tag the frozen release and preserve `study_version` in all exported data.

Built against the official [jsPsych 8 documentation](https://www.jspsych.org/latest/).
