"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProlificCompletion, SubmissionNotice, type SubmissionStatus } from "./completion";
import { recruitmentMetadata } from "./recruitment";

type StudyStage = "landing" | "running" | "saving" | "complete" | "error";
type Side = "left" | "right";

type DotTrial = {
  id: string;
  leftCount: number;
  rightCount: number;
  correctChoice: Side;
  aiChoice: Side;
};

type TrialRecord = {
  phase?: string;
  item_id?: string;
  sequence_position?: number;
  response?: Record<string, string | number> | number;
  rt?: number;
  initial_choice?: Side;
  initial_confidence?: number;
  final_choice?: Side;
  final_confidence?: number;
  correct_choice?: Side;
  ai_choice?: Side;
  ai_correct?: boolean;
  initial_correct?: boolean;
  final_correct?: boolean;
  initial_agreement_ai?: boolean;
  final_agreement_ai?: boolean;
  switched?: boolean;
  switched_toward_ai?: boolean;
  switched_away_ai?: boolean;
  confidence_change?: number;
  ai_confidence_shift?: number;
  initial_pointer_events?: number;
  initial_pointer_path_px?: number;
  advice_pointer_events?: number;
  advice_pointer_path_px?: number;
  stias_index?: number;
  common_trust_index?: number;
  typing_key_count?: number;
  typing_printable_count?: number;
  typing_backspace_count?: number;
  typing_backspace_rate?: number;
  typing_first_key_latency_ms?: number | null;
  typing_mean_iki_ms?: number | null;
  typing_median_iki_ms?: number | null;
  typing_pause_count_1000ms?: number;
  typing_pause_time_ms?: number;
  typing_duration_ms?: number | null;
  typing_wpm?: number | null;
  typing_input_events?: number;
  typing_paste_events?: number;
  text_word_count?: number;
  text_conditional_count?: number;
  text_hedge_count?: number;
  text_human_agency_count?: number;
  text_ai_reference_count?: number;
  text_verification_count?: number;
};

type CompletionData = {
  participantId: string;
  csv: string;
  json: string;
  submissionStatus: SubmissionStatus;
  recruitment: ReturnType<typeof recruitmentMetadata>;
};

type PointerSummary = {
  pointer_type: string;
  pointer_events: number;
  pointer_path_px: number;
  pointer_reversals: number;
  pointer_idle_gaps_500ms: number;
};

type PointerTracker = {
  finish: () => PointerSummary;
};

type TypingSummary = {
  key_count: number;
  printable_count: number;
  backspace_count: number;
  backspace_rate: number;
  first_key_latency_ms: number | null;
  mean_iki_ms: number | null;
  median_iki_ms: number | null;
  pause_count_1000ms: number;
  pause_time_ms: number;
  duration_ms: number | null;
  input_events: number;
  paste_events: number;
};

const STUDY_ID = "confiia_ai_trust_behavioral_signals";
const STUDY_VERSION = "1.0.3";
const DATA_ENDPOINT = import.meta.env.VITE_DATA_ENDPOINT?.trim() ?? "";
const STUDY_ONE_URL =
  "https://anibalmastobiza.github.io/confiia-ai-trust-framing-study/";

const DOT_TRIALS: DotTrial[] = [
  {
    id: "dots_01",
    leftCount: 47,
    rightCount: 54,
    correctChoice: "right",
    aiChoice: "right",
  },
  {
    id: "dots_02",
    leftCount: 58,
    rightCount: 51,
    correctChoice: "left",
    aiChoice: "left",
  },
  {
    id: "dots_03",
    leftCount: 46,
    rightCount: 52,
    correctChoice: "right",
    aiChoice: "left",
  },
  {
    id: "dots_04",
    leftCount: 55,
    rightCount: 49,
    correctChoice: "left",
    aiChoice: "left",
  },
  {
    id: "dots_05",
    leftCount: 50,
    rightCount: 57,
    correctChoice: "right",
    aiChoice: "right",
  },
  {
    id: "dots_06",
    leftCount: 53,
    rightCount: 59,
    correctChoice: "right",
    aiChoice: "left",
  },
];

const TRUST_SCALE = [
  "Not at all",
  "Very slightly",
  "Slightly",
  "Moderately",
  "Quite",
  "Very",
  "Extremely",
];

const SIDE_LABEL: Record<Side, string> = {
  left: "LEFT",
  right: "RIGHT",
};

function makeParticipantId() {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `CONFIIA2-${randomPart.toUpperCase()}`;
}

function seededRandom(seedText: string) {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDotCloud(count: number, seed: string) {
  const random = seededRandom(seed);
  const dots = Array.from({ length: count }, (_, index) => {
    const size = 4 + Math.round(random() * 3);
    const left = 4 + random() * 90;
    const top = 6 + random() * 86;
    const opacity = 0.72 + random() * 0.28;
    return `<span class="dot" aria-hidden="true" data-dot="${index}" style="left:${left.toFixed(
      2,
    )}%;top:${top.toFixed(2)}%;width:${size}px;height:${size}px;opacity:${opacity.toFixed(
      2,
    )}"></span>`;
  });

  return `<div class="dot-panel" aria-hidden="true">${dots.join("")}</div>`;
}

function attachPointerTracker(element: HTMLElement): PointerTracker {
  let events = 0;
  let path = 0;
  let reversals = 0;
  let idleGaps = 0;
  let pointerType = "none";
  let previous: { x: number; y: number; time: number } | null = null;
  let previousVector: { x: number; y: number } | null = null;

  const onPointerMove = (event: PointerEvent) => {
    events += 1;
    pointerType = event.pointerType || pointerType;
    const current = { x: event.clientX, y: event.clientY, time: event.timeStamp };

    if (previous) {
      const vector = { x: current.x - previous.x, y: current.y - previous.y };
      path += Math.hypot(vector.x, vector.y);
      if (current.time - previous.time > 500) idleGaps += 1;
      if (
        previousVector &&
        vector.x * previousVector.x + vector.y * previousVector.y < 0
      ) {
        reversals += 1;
      }
      if (vector.x !== 0 || vector.y !== 0) previousVector = vector;
    }

    previous = current;
  };

  element.addEventListener("pointermove", onPointerMove, { passive: true });

  return {
    finish: () => {
      element.removeEventListener("pointermove", onPointerMove);
      return {
        pointer_type: pointerType,
        pointer_events: events,
        pointer_path_px: Math.round(path),
        pointer_reversals: reversals,
        pointer_idle_gaps_500ms: idleGaps,
      };
    },
  };
}

function attachTypingTracker(textarea: HTMLTextAreaElement) {
  const shownAt = performance.now();
  const keyTimes: number[] = [];
  let keyCount = 0;
  let printableCount = 0;
  let backspaceCount = 0;
  let inputEvents = 0;
  let pasteEvents = 0;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const now = performance.now();
    keyTimes.push(now);
    keyCount += 1;
    if (event.key.length === 1) printableCount += 1;
    if (event.key === "Backspace" || event.key === "Delete") backspaceCount += 1;
  };
  const onInput = () => {
    inputEvents += 1;
  };
  const onPaste = () => {
    pasteEvents += 1;
  };

  textarea.addEventListener("keydown", onKeyDown);
  textarea.addEventListener("input", onInput);
  textarea.addEventListener("paste", onPaste);

  return {
    finish: (): TypingSummary => {
      textarea.removeEventListener("keydown", onKeyDown);
      textarea.removeEventListener("input", onInput);
      textarea.removeEventListener("paste", onPaste);
      const intervals = keyTimes
        .slice(1)
        .map((time, index) => time - keyTimes[index])
        .filter((interval) => interval > 0 && interval < 10000);
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted.length
        ? sorted.length % 2
          ? sorted[(sorted.length - 1) / 2]
          : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : null;
      const duration = keyTimes.length > 1 ? keyTimes.at(-1)! - keyTimes[0] : null;

      return {
        key_count: keyCount,
        printable_count: printableCount,
        backspace_count: backspaceCount,
        backspace_rate: keyCount ? backspaceCount / keyCount : 0,
        first_key_latency_ms: keyTimes.length ? keyTimes[0] - shownAt : null,
        mean_iki_ms: intervals.length
          ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
          : null,
        median_iki_ms: median,
        pause_count_1000ms: intervals.filter((interval) => interval >= 1000).length,
        pause_time_ms: intervals
          .filter((interval) => interval >= 1000)
          .reduce((sum, value) => sum + value, 0),
        duration_ms: duration,
        input_events: inputEvents,
        paste_events: pasteEvents,
      };
    },
  };
}

function countWords(tokens: string[], vocabulary: Set<string>) {
  return tokens.filter((token) => vocabulary.has(token)).length;
}

function extractTextFeatures(text: string) {
  const tokens = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  const conditional = new Set(["if", "unless", "when", "whether", "depends"]);
  const hedge = new Set([
    "maybe",
    "perhaps",
    "probably",
    "possibly",
    "uncertain",
    "unsure",
    "seems",
    "think",
  ]);
  const humanAgency = new Set([
    "i",
    "me",
    "my",
    "myself",
    "human",
    "judgment",
    "decide",
    "choice",
  ]);
  const aiReference = new Set([
    "ai",
    "algorithm",
    "model",
    "system",
    "adviser",
    "advisor",
  ]);
  const verification = new Set([
    "check",
    "verify",
    "compare",
    "evidence",
    "accuracy",
    "correct",
    "mistake",
    "wrong",
  ]);

  return {
    word_count: tokens.length,
    conditional_count: countWords(tokens, conditional),
    hedge_count: countWords(tokens, hedge),
    human_agency_count: countWords(tokens, humanAgency),
    ai_reference_count: countWords(tokens, aiReference),
    verification_count: countWords(tokens, verification),
  };
}

function mean(values: Array<number | null | undefined>) {
  const available = values.filter((value): value is number =>
    Number.isFinite(value),
  );
  if (!available.length) return null;
  return available.reduce((sum, value) => sum + value, 0) / available.length;
}

function round(value: number | null, digits = 3): number | "" {
  if (value === null || !Number.isFinite(value)) return "";
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function responseValue(trial: TrialRecord | undefined, key: string) {
  if (!trial || typeof trial.response !== "object") return "";
  return trial.response[key] ?? "";
}

function viewportBucket() {
  const width = window.innerWidth;
  if (width < 480) return "under_480";
  if (width < 768) return "480_to_767";
  if (width < 1200) return "768_to_1199";
  return "1200_plus";
}

async function submitStudyData(payload: Record<string, unknown>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await fetch(DATA_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
      }
    }
  }
  throw lastError;
}

function downloadFile(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [stage, setStage] = useState<StudyStage>("landing");
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const experimentElement = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const runStudy = useCallback(async () => {
    if (!experimentElement.current || started.current) return;
    started.current = true;

    try {
      const [
        jsPsychModule,
        buttonModule,
        keyboardModule,
        sliderModule,
        htmlFormModule,
        likertModule,
        multiChoiceModule,
      ] = await Promise.all([
        import("jspsych"),
        import("@jspsych/plugin-html-button-response"),
        import("@jspsych/plugin-html-keyboard-response"),
        import("@jspsych/plugin-html-slider-response"),
        import("@jspsych/plugin-survey-html-form"),
        import("@jspsych/plugin-survey-likert"),
        import("@jspsych/plugin-survey-multi-choice"),
      ]);

      const { initJsPsych } = jsPsychModule;
      const htmlButtonResponse = buttonModule.default;
      const htmlKeyboardResponse = keyboardModule.default;
      const htmlSliderResponse = sliderModule.default;
      const surveyHtmlForm = htmlFormModule.default;
      const surveyLikert = likertModule.default;
      const surveyMultiChoice = multiChoiceModule.default;
      const participantId = makeParticipantId();
      const submissionId = crypto.randomUUID();
      const recruitment = recruitmentMetadata(window.location.search);
      const sessionStartedUtc = new Date().toISOString();
      const sessionStartedMs = Date.now();
      const itemState = new Map<
        string,
        { initialChoice?: Side; initialConfidence?: number }
      >();

      const jsPsych = initJsPsych({
        display_element: experimentElement.current,
        show_progress_bar: true,
        auto_update_progress_bar: true,
        message_progress_bar: "Study progress",
        default_iti: 120,
        on_finish: () => {
          setStage("saving");
          const data = jsPsych.data.get();
          const trials = data.values() as TrialRecord[];
          const findTrial = (phase: string, itemId?: string) =>
            trials.find(
              (record) =>
                record.phase === phase &&
                (itemId === undefined || record.item_id === itemId),
            );
          const trialSequence = trials
            .filter((record) => record.phase === "initial_choice")
            .sort(
              (a, b) =>
                (a.sequence_position ?? 0) - (b.sequence_position ?? 0),
            );
          const itemRows = trialSequence.map((initial) => {
            const itemId = initial.item_id!;
            const confidence = findTrial("initial_confidence", itemId);
            const advice = findTrial("advice_decision", itemId);
            return {
              item_id: itemId,
              sequence_position: initial.sequence_position,
              correct_choice: advice?.correct_choice,
              ai_choice: advice?.ai_choice,
              ai_correct: advice?.ai_correct,
              initial_choice: advice?.initial_choice,
              initial_correct: advice?.initial_correct,
              initial_rt_ms: initial.rt,
              initial_confidence: advice?.initial_confidence,
              confidence_rt_ms: confidence?.rt,
              final_choice: advice?.final_choice,
              final_correct: advice?.final_correct,
              advice_rt_ms: advice?.rt,
              final_confidence: advice?.final_confidence,
              initial_agreement_ai: advice?.initial_agreement_ai,
              final_agreement_ai: advice?.final_agreement_ai,
              switched: advice?.switched,
              switched_toward_ai: advice?.switched_toward_ai,
              switched_away_ai: advice?.switched_away_ai,
              confidence_change: advice?.confidence_change,
              ai_confidence_shift: advice?.ai_confidence_shift,
              initial_pointer_events: initial.initial_pointer_events,
              initial_pointer_path_px: initial.initial_pointer_path_px,
              advice_pointer_events: advice?.advice_pointer_events,
              advice_pointer_path_px: advice?.advice_pointer_path_px,
            };
          });

          const disagreementRows = itemRows.filter(
            (row) => row.initial_agreement_ai === false,
          );
          const agreementRows = itemRows.filter(
            (row) => row.initial_agreement_ai === true,
          );
          const rairRows = itemRows.filter(
            (row) => row.initial_correct === false && row.ai_correct === true,
          );
          const rsrRows = itemRows.filter(
            (row) => row.initial_correct === true && row.ai_correct === false,
          );
          const alignedRows = itemRows.filter(
            (row) => row.final_agreement_ai === true,
          );
          const nonAlignedRows = itemRows.filter(
            (row) => row.final_agreement_ai === false,
          );
          const alignedAdviceRt = mean(
            alignedRows.map((row) => Number(row.advice_rt_ms)),
          );
          const nonAlignedAdviceRt = mean(
            nonAlignedRows.map((row) => Number(row.advice_rt_ms)),
          );
          const alignmentFluency =
            alignedAdviceRt === null || nonAlignedAdviceRt === null
              ? null
              : nonAlignedAdviceRt - alignedAdviceRt;
          const typing = findTrial("reasoning_trace");
          const trust = findTrial("trust_outcomes");
          const background = findTrial("background");
          const rair = mean(
            rairRows.map((row) => (row.final_agreement_ai ? 1 : 0)),
          );
          const rsr = mean(
            rsrRows.map((row) => (row.final_agreement_ai ? 0 : 1)),
          );

          const payload = {
            study_id: STUDY_ID,
            study_version: STUDY_VERSION,
            submission_id: submissionId,
            participant_id: participantId,
            jspsych_version: jsPsych.version(),
            session_started_utc: sessionStartedUtc,
            session_completed_utc: new Date().toISOString(),
            total_elapsed_ms: Date.now() - sessionStartedMs,
            viewport_bucket: viewportBucket(),
            coarse_pointer: window.matchMedia("(pointer: coarse)").matches,
            trial_order: itemRows.map((row) => row.item_id).join("|"),
            initial_accuracy: round(
              mean(itemRows.map((row) => (row.initial_correct ? 1 : 0))),
            ),
            final_accuracy: round(
              mean(itemRows.map((row) => (row.final_correct ? 1 : 0))),
            ),
            ai_alignment_rate: round(
              mean(itemRows.map((row) => (row.final_agreement_ai ? 1 : 0))),
            ),
            disagreement_trials: disagreementRows.length,
            switched_toward_ai_rate: round(
              mean(
                disagreementRows.map((row) =>
                  row.switched_toward_ai ? 1 : 0,
                ),
              ),
            ),
            switched_away_ai_rate: round(
              mean(
                agreementRows.map((row) => (row.switched_away_ai ? 1 : 0)),
              ),
            ),
            rair: round(rair),
            rsr: round(rsr),
            appropriate_reliance_score: round(mean([rair, rsr])),
            mean_initial_confidence: round(
              mean(itemRows.map((row) => Number(row.initial_confidence))),
              1,
            ),
            mean_final_confidence: round(
              mean(itemRows.map((row) => Number(row.final_confidence))),
              1,
            ),
            mean_confidence_change: round(
              mean(itemRows.map((row) => Number(row.confidence_change))),
              1,
            ),
            mean_ai_confidence_shift: round(
              mean(itemRows.map((row) => Number(row.ai_confidence_shift))),
              1,
            ),
            mean_initial_rt_ms: round(
              mean(itemRows.map((row) => Number(row.initial_rt_ms))),
              0,
            ),
            mean_advice_rt_ms: round(
              mean(itemRows.map((row) => Number(row.advice_rt_ms))),
              0,
            ),
            ai_alignment_fluency_ms: round(alignmentFluency, 0),
            mean_pointer_path_px: round(
              mean(
                itemRows.flatMap((row) => [
                  Number(row.initial_pointer_path_px),
                  Number(row.advice_pointer_path_px),
                ]),
              ),
              0,
            ),
            typing_key_count: typing?.typing_key_count ?? "",
            typing_printable_count: typing?.typing_printable_count ?? "",
            typing_backspace_count: typing?.typing_backspace_count ?? "",
            typing_backspace_rate: round(typing?.typing_backspace_rate ?? null),
            typing_first_key_latency_ms: round(
              typing?.typing_first_key_latency_ms ?? null,
              0,
            ),
            typing_mean_iki_ms: round(typing?.typing_mean_iki_ms ?? null, 0),
            typing_median_iki_ms: round(
              typing?.typing_median_iki_ms ?? null,
              0,
            ),
            typing_pause_count_1000ms:
              typing?.typing_pause_count_1000ms ?? "",
            typing_pause_time_ms: round(typing?.typing_pause_time_ms ?? null, 0),
            typing_duration_ms: round(typing?.typing_duration_ms ?? null, 0),
            typing_wpm: round(typing?.typing_wpm ?? null, 1),
            typing_input_events: typing?.typing_input_events ?? "",
            typing_paste_events: typing?.typing_paste_events ?? "",
            text_word_count: typing?.text_word_count ?? "",
            text_conditional_count: typing?.text_conditional_count ?? "",
            text_hedge_count: typing?.text_hedge_count ?? "",
            text_human_agency_count: typing?.text_human_agency_count ?? "",
            text_ai_reference_count: typing?.text_ai_reference_count ?? "",
            text_verification_count: typing?.text_verification_count ?? "",
            stias_confident: responseValue(trust, "stias_confident"),
            stias_reliable: responseValue(trust, "stias_reliable"),
            stias_trust: responseValue(trust, "stias_trust"),
            common_primary_trust: responseValue(trust, "common_primary_trust"),
            common_comfort: responseValue(trust, "common_comfort"),
            stias_index: trust?.stias_index ?? "",
            common_trust_index: trust?.common_trust_index ?? "",
            ai_familiarity: responseValue(background, "ai_familiarity"),
            ai_use_frequency: responseValue(background, "ai_use_frequency"),
            english_comfort: responseValue(background, "english_comfort"),
            input_method: responseValue(background, "input_method"),
            previous_confiia_study: responseValue(
              background,
              "previous_confiia_study",
            ),
            age_band: responseValue(background, "age_band"),
            sex_assigned_at_birth: responseValue(
              background,
              "sex_assigned_at_birth",
            ),
            consent_rt_ms: findTrial("consent")?.rt ?? "",
            reasoning_rt_ms: typing?.rt ?? "",
            trust_rt_ms: trust?.rt ?? "",
            background_rt_ms: background?.rt ?? "",
            item_level_json: JSON.stringify(itemRows),
            ...recruitment,
          };

          void (async () => {
            let submissionStatus: SubmissionStatus = "not_configured";
            if (DATA_ENDPOINT) {
              try {
                await submitStudyData(payload);
                submissionStatus = "sent";
              } catch (submissionError) {
                console.error(
                  "Study response could not be stored",
                  submissionError,
                );
                submissionStatus = "failed";
              }
            }

            setCompletion({
              participantId,
              csv: data.csv(),
              json: data.json(),
              submissionStatus,
              recruitment,
            });
            setStage("complete");
          })();
        },
      });

      const trialOrder = jsPsych.randomization.shuffle([...DOT_TRIALS]);
      jsPsych.data.addProperties({
        participant_id: participantId,
        study_id: STUDY_ID,
        study_version: STUDY_VERSION,
        jspsych_version: jsPsych.version(),
        session_started_utc: sessionStartedUtc,
        trial_order: trialOrder.map((trial) => trial.id).join("|"),
        ...recruitment,
      });

      const timeline: any[] = [
        {
          type: htmlButtonResponse,
          stimulus: `
            <section class="trial-card consent-card">
              <p class="trial-kicker">Before you begin</p>
              <h1>A brief study of decisions with an AI adviser</h1>
              <p>You are invited to take part in a minimal-risk research pilot about trust in AI-assisted decisions.</p>
              <div class="consent-grid">
                <div><span>Time</span><strong>About 5 minutes</strong></div>
                <div><span>Task</span><strong>Six visual decisions and brief questions</strong></div>
                <div><span>Privacy</span><strong>No camera, microphone, name, or email</strong></div>
              </div>
              <p class="fine-print">The study records choices, response times, confidence updates, aggregate pointer movement, and typing timing. You will write one short sentence, but the sentence itself is discarded in your browser; only timing, edit counts, word count, and pre-defined word-category counts are stored. Raw pointer paths and individual keys are not stored. Participation is voluntary and you may stop by closing this page. Research data will be stored in a private research spreadsheet. If you enter through Prolific, your Prolific participant, study and session IDs are also stored to match your submission for payment. This pilot is not an evaluation of your ability. Questions may be directed to <a href="mailto:amastobiza@ugr.es">amastobiza@ugr.es</a>.</p>
            </section>`,
          choices: ["I am 18 or older and I agree"],
          data: { phase: "consent" },
        },
        {
          type: htmlButtonResponse,
          stimulus: `
            <section class="trial-card instruction-card">
              <p class="trial-kicker">How it works</p>
              <h2>Decide first. Then consider the AI.</h2>
              <ol class="instruction-steps">
                <li><span>1</span><p>Two dot clouds appear briefly. Choose the side with more dots.</p></li>
                <li><span>2</span><p>Rate confidence in your first answer.</p></li>
                <li><span>3</span><p>See the AI recommendation, make a final choice, and receive feedback.</p></li>
              </ol>
              <p class="fine-print">The adviser is imperfect and can make mistakes. On a computer, you may also use the left and right arrow keys for the first choice. Please answer without counting individual dots.</p>
            </section>`,
          choices: ["Start the six decisions"],
          data: { phase: "instructions" },
        },
      ];

      trialOrder.forEach((trial, index) => {
        const sequencePosition = index + 1;
        let initialPointerTracker: PointerTracker | null = null;
        let advicePointerTracker: PointerTracker | null = null;
        let initialKeyboardHandler: ((event: KeyboardEvent) => void) | null =
          null;

        timeline.push(
          {
            type: htmlButtonResponse,
            stimulus: `
              <section class="trial-card dot-card">
                <div class="trial-topline"><p class="trial-kicker">Visual decision ${sequencePosition} of 6</p><span>Shown for 1.2 seconds</span></div>
                <h2>Which side has more dots?</h2>
                <div class="dot-comparison">
                  <div><span class="side-tag">Left</span>${makeDotCloud(
                    trial.leftCount,
                    `${trial.id}-left`,
                  )}</div>
                  <div><span class="side-tag">Right</span>${makeDotCloud(
                    trial.rightCount,
                    `${trial.id}-right`,
                  )}</div>
                </div>
              </section>`,
            choices: ["Left", "Right"],
            button_html: (choice: string) =>
              `<button class="jspsych-btn decision-button" data-choice="${choice.toLowerCase()}">${choice}</button>`,
            stimulus_duration: 1200,
            prompt: "<p class=\"choice-prompt\">Choose from memory. A quick impression is enough.</p>",
            data: {
              phase: "initial_choice",
              item_id: trial.id,
              sequence_position: sequencePosition,
              dot_count_left: trial.leftCount,
              dot_count_right: trial.rightCount,
            },
            on_load: () => {
              if (experimentElement.current) {
                initialPointerTracker = attachPointerTracker(
                  experimentElement.current,
                );
              }
              initialKeyboardHandler = (event: KeyboardEvent) => {
                const choice =
                  event.key === "ArrowLeft"
                    ? "left"
                    : event.key === "ArrowRight"
                      ? "right"
                      : null;
                if (!choice) return;
                const button = document.querySelector<HTMLButtonElement>(
                  `.decision-button[data-choice="${choice}"]`,
                );
                if (button && !button.disabled) button.click();
              };
              document.addEventListener("keydown", initialKeyboardHandler);
            },
            on_finish: (data: TrialRecord) => {
              if (initialKeyboardHandler) {
                document.removeEventListener("keydown", initialKeyboardHandler);
              }
              const choice: Side = data.response === 0 ? "left" : "right";
              itemState.set(trial.id, { initialChoice: choice });
              data.initial_choice = choice;
              data.correct_choice = trial.correctChoice;
              data.initial_correct = choice === trial.correctChoice;
              if (initialPointerTracker) {
                const pointer = initialPointerTracker.finish();
                data.initial_pointer_events = pointer.pointer_events;
                data.initial_pointer_path_px = pointer.pointer_path_px;
                Object.assign(data, {
                  initial_pointer_type: pointer.pointer_type,
                  initial_pointer_reversals: pointer.pointer_reversals,
                  initial_pointer_idle_gaps_500ms:
                    pointer.pointer_idle_gaps_500ms,
                });
              }
            },
          },
          {
            type: htmlSliderResponse,
            stimulus: `
              <section class="trial-card confidence-card">
                <p class="trial-kicker">Visual decision ${sequencePosition} of 6</p>
                <h2>How confident are you in your first choice?</h2>
                <p>Use the full scale. There are no penalties for uncertainty.</p>
              </section>`,
            labels: ["Not at all confident", "Completely confident"],
            min: 0,
            max: 100,
            slider_start: 50,
            step: 1,
            require_movement: true,
            button_label: "See the AI recommendation",
            data: {
              phase: "initial_confidence",
              item_id: trial.id,
              sequence_position: sequencePosition,
            },
            on_finish: (data: TrialRecord) => {
              const value = Number(data.response);
              const state = itemState.get(trial.id) ?? {};
              state.initialConfidence = value;
              itemState.set(trial.id, state);
              data.initial_confidence = value;
            },
          },
          {
            type: surveyHtmlForm,
            preamble: `
              <section class="trial-card advice-card">
                <p class="trial-kicker">AI recommendation · decision ${sequencePosition} of 6</p>
                <div class="ai-recommendation"><span>AI adviser recommends</span><strong>${SIDE_LABEL[trial.aiChoice]}</strong></div>
                <h2>What is your final answer?</h2>
                <p>You may keep or change your first choice.</p>
              </section>`,
            html: `
              <div class="advice-form">
                <fieldset>
                  <legend>Final choice</legend>
                  <div class="binary-choice">
                    <label><input type="radio" name="final_choice" value="left" required /> Left</label>
                    <label><input type="radio" name="final_choice" value="right" required /> Right</label>
                  </div>
                </fieldset>
                <label class="final-confidence-label" for="final-confidence">Final confidence: <output id="final-confidence-output">${
                  itemState.get(trial.id)?.initialConfidence ?? 50
                }</output>/100</label>
                <input id="final-confidence" name="final_confidence" type="range" min="0" max="100" step="1" value="${
                  itemState.get(trial.id)?.initialConfidence ?? 50
                }" />
                <div class="range-labels"><span>Not at all confident</span><span>Completely confident</span></div>
              </div>`,
            button_label: "Lock final answer",
            data: {
              phase: "advice_decision",
              item_id: trial.id,
              sequence_position: sequencePosition,
            },
            on_load: () => {
              const range = document.getElementById(
                "final-confidence",
              ) as HTMLInputElement | null;
              const output = document.getElementById(
                "final-confidence-output",
              );
              range?.addEventListener("input", () => {
                if (output) output.textContent = range.value;
              });
              if (experimentElement.current) {
                advicePointerTracker = attachPointerTracker(
                  experimentElement.current,
                );
              }
            },
            on_finish: (data: TrialRecord) => {
              const response = data.response as Record<string, string>;
              const state = itemState.get(trial.id) ?? {};
              const initialChoice = state.initialChoice!;
              const initialConfidence = state.initialConfidence ?? 50;
              const finalChoice = response.final_choice as Side;
              const finalConfidence = Number(response.final_confidence);
              data.response = {
                final_choice: finalChoice,
                final_confidence: finalConfidence,
              };
              data.initial_choice = initialChoice;
              data.initial_confidence = initialConfidence;
              data.correct_choice = trial.correctChoice;
              data.ai_choice = trial.aiChoice;
              data.ai_correct = trial.aiChoice === trial.correctChoice;
              data.final_choice = finalChoice;
              data.final_confidence = finalConfidence;
              data.initial_correct = initialChoice === trial.correctChoice;
              data.final_correct = finalChoice === trial.correctChoice;
              data.initial_agreement_ai = initialChoice === trial.aiChoice;
              data.final_agreement_ai = finalChoice === trial.aiChoice;
              data.switched = finalChoice !== initialChoice;
              data.switched_toward_ai =
                initialChoice !== trial.aiChoice && finalChoice === trial.aiChoice;
              data.switched_away_ai =
                initialChoice === trial.aiChoice && finalChoice !== trial.aiChoice;
              data.confidence_change = finalConfidence - initialConfidence;
              data.ai_confidence_shift =
                (finalConfidence - initialConfidence) *
                (finalChoice === trial.aiChoice ? 1 : -1);
              if (advicePointerTracker) {
                const pointer = advicePointerTracker.finish();
                data.advice_pointer_events = pointer.pointer_events;
                data.advice_pointer_path_px = pointer.pointer_path_px;
                Object.assign(data, {
                  advice_pointer_type: pointer.pointer_type,
                  advice_pointer_reversals: pointer.pointer_reversals,
                  advice_pointer_idle_gaps_500ms:
                    pointer.pointer_idle_gaps_500ms,
                });
              }
            },
          },
          {
            type: htmlButtonResponse,
            stimulus: `
              <section class="trial-card feedback-card ${
                trial.aiChoice === trial.correctChoice
                  ? "feedback-correct"
                  : "feedback-error"
              }">
                <p class="trial-kicker">Feedback · decision ${sequencePosition} of 6</p>
                <h2>The correct answer was ${SIDE_LABEL[
                  trial.correctChoice
                ]}.</h2>
                <p>The AI recommendation was <strong>${
                  trial.aiChoice === trial.correctChoice ? "correct" : "incorrect"
                }</strong> on this decision.</p>
              </section>`,
            choices: [sequencePosition === 6 ? "Continue" : "Next decision"],
            enable_button_after: 450,
            data: {
              phase: "feedback",
              item_id: trial.id,
              sequence_position: sequencePosition,
              ai_correct: trial.aiChoice === trial.correctChoice,
            },
          },
        );
      });

      let typingTracker: ReturnType<typeof attachTypingTracker> | null = null;
      timeline.push(
        {
          type: surveyHtmlForm,
          preamble: `
            <div class="survey-heading">
              <p class="trial-kicker">One sentence</p>
              <h2>What guided your decision to follow or reject the AI adviser?</h2>
              <p>Write one short sentence in English. We analyze it in your browser and discard the sentence itself.</p>
            </div>`,
          html: `
            <div class="reasoning-form">
              <label for="reasoning-text">Your sentence</label>
              <textarea id="reasoning-text" name="reasoning_text" minlength="20" maxlength="240" rows="4" required autocomplete="off" autocapitalize="sentences" placeholder="For example: I followed it when... (write your own response)"></textarea>
              <div class="privacy-chip"><span aria-hidden="true">●</span> Text discarded locally · derived counts only</div>
            </div>`,
          autofocus: "reasoning-text",
          button_label: "Continue",
          data: { phase: "reasoning_trace" },
          on_load: () => {
            const textarea = document.getElementById(
              "reasoning-text",
            ) as HTMLTextAreaElement | null;
            if (textarea) typingTracker = attachTypingTracker(textarea);
          },
          on_finish: (data: TrialRecord) => {
            const response = data.response as Record<string, string>;
            const text = response.reasoning_text ?? "";
            const typing = typingTracker?.finish();
            const textFeatures = extractTextFeatures(text);
            data.response = { reasoning_text: "[discarded after local extraction]" };
            data.typing_key_count = typing?.key_count ?? 0;
            data.typing_printable_count = typing?.printable_count ?? 0;
            data.typing_backspace_count = typing?.backspace_count ?? 0;
            data.typing_backspace_rate = typing?.backspace_rate ?? 0;
            data.typing_first_key_latency_ms =
              typing?.first_key_latency_ms ?? null;
            data.typing_mean_iki_ms = typing?.mean_iki_ms ?? null;
            data.typing_median_iki_ms = typing?.median_iki_ms ?? null;
            data.typing_pause_count_1000ms =
              typing?.pause_count_1000ms ?? 0;
            data.typing_pause_time_ms = typing?.pause_time_ms ?? 0;
            data.typing_duration_ms = typing?.duration_ms ?? null;
            data.typing_wpm =
              typing?.duration_ms && typing.duration_ms > 0
                ? textFeatures.word_count / (typing.duration_ms / 60000)
                : null;
            data.typing_input_events = typing?.input_events ?? 0;
            data.typing_paste_events = typing?.paste_events ?? 0;
            data.text_word_count = textFeatures.word_count;
            data.text_conditional_count = textFeatures.conditional_count;
            data.text_hedge_count = textFeatures.hedge_count;
            data.text_human_agency_count = textFeatures.human_agency_count;
            data.text_ai_reference_count = textFeatures.ai_reference_count;
            data.text_verification_count = textFeatures.verification_count;
          },
        },
        {
          type: surveyLikert,
          preamble: `
            <div class="survey-heading">
              <p class="trial-kicker">Your impression</p>
              <h2>How do you now view the AI adviser?</h2>
              <p>Answer based on the six decisions you just completed.</p>
            </div>`,
          questions: [
            {
              prompt: "I am confident in the AI adviser.",
              name: "stias_confident",
              labels: TRUST_SCALE,
              required: true,
            },
            {
              prompt: "The AI adviser is reliable.",
              name: "stias_reliable",
              labels: TRUST_SCALE,
              required: true,
            },
            {
              prompt: "I can trust the AI adviser.",
              name: "stias_trust",
              labels: TRUST_SCALE,
              required: true,
            },
            {
              prompt: "I would trust this AI adviser to support my decision.",
              name: "common_primary_trust",
              labels: TRUST_SCALE,
              required: true,
            },
            {
              prompt:
                "I would feel comfortable using this AI adviser to support my decisions.",
              name: "common_comfort",
              labels: TRUST_SCALE,
              required: true,
            },
          ],
          button_label: "Continue",
          data: { phase: "trust_outcomes" },
          on_finish: (data: TrialRecord) => {
            const response = data.response as Record<string, number>;
            data.stias_index = Number(
              mean([
                Number(response.stias_confident),
                Number(response.stias_reliable),
                Number(response.stias_trust),
              ])?.toFixed(2),
            );
            data.common_trust_index = Number(
              mean([
                Number(response.common_primary_trust),
                Number(response.common_comfort),
                Number(response.stias_reliable),
              ])?.toFixed(2),
            );
          },
        },
        {
          type: surveyMultiChoice,
          preamble: `
            <div class="survey-heading">
              <p class="trial-kicker">Final questions</p>
              <h2>A little context about you</h2>
              <p>These variables help separate behavioral signals from device and prior-experience differences.</p>
            </div>`,
          questions: [
            {
              prompt: "How familiar are you with AI systems and applications?",
              name: "ai_familiarity",
              options: [
                "Not at all familiar",
                "Slightly familiar",
                "Moderately familiar",
                "Very familiar",
                "Extremely familiar",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt: "How often do you use generative AI tools?",
              name: "ai_use_frequency",
              options: [
                "Never",
                "Less than monthly",
                "Monthly",
                "Weekly",
                "Daily or almost daily",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt: "How comfortable are you writing a short sentence in English?",
              name: "english_comfort",
              options: [
                "Not at all comfortable",
                "Slightly comfortable",
                "Moderately comfortable",
                "Very comfortable",
                "Completely comfortable",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt: "What input method did you mainly use in this study?",
              name: "input_method",
              options: [
                "Physical keyboard and mouse or trackpad",
                "Physical keyboard without a mouse or trackpad",
                "Touchscreen and on-screen keyboard",
                "Another input method",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt:
                "Have you previously completed CONFIIA Study 01 about a sentence describing medical AI?",
              name: "previous_confiia_study",
              options: ["No", "Yes", "Not sure"],
              required: true,
            },
            {
              prompt: "What is your age range?",
              name: "age_band",
              options: [
                "18–24",
                "25–34",
                "35–44",
                "45–54",
                "55–64",
                "65 or older",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt:
                "What sex were you assigned at birth, on your original birth certificate?",
              name: "sex_assigned_at_birth",
              options: [
                "Female",
                "Male",
                "Another sex or intersex",
                "Prefer not to answer",
              ],
              required: true,
            },
          ],
          button_label: "Finish study",
          data: { phase: "background" },
        },
        {
          type: htmlKeyboardResponse,
          stimulus: "<p>Preparing your debrief…</p>",
          choices: "NO_KEYS",
          trial_duration: 50,
          data: { phase: "handoff" },
        },
      );

      jsPsych.run(timeline);
    } catch (studyError) {
      console.error("The study could not start", studyError);
      started.current = false;
      setStage("error");
    }
  }, []);

  useEffect(() => {
    // jsPsych initializes after React has mounted the dedicated experiment element.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stage === "running") void runStudy();
  }, [runStudy, stage]);

  if (stage === "running") {
    return (
      <main className="study-shell running-shell">
        <header className="study-header compact-header">
          <a className="wordmark" href={STUDY_ONE_URL} target="_blank" rel="noreferrer">
            <span className="mark" aria-hidden="true">C</span>
            CONFIIA / Study 02
          </a>
          <span className="session-label">Behavioral research session</span>
        </header>
        <div ref={experimentElement} className="experiment-mount" />
      </main>
    );
  }

  if (stage === "saving") {
    return (
      <main className="study-shell centered-shell" aria-live="polite">
        <section className="saving-card">
          <div className="pulse-mark" aria-hidden="true" />
          <p className="trial-kicker">One moment</p>
          <h1>Sending your response…</h1>
          <p>Please keep this page open. This can take up to 15 seconds.</p>
        </section>
      </main>
    );
  }

  if (stage === "complete" && completion) {
    return (
      <main className="study-shell completion-shell">
        <header className="study-header compact-header">
          <a className="wordmark" href={STUDY_ONE_URL} target="_blank" rel="noreferrer">
            <span className="mark" aria-hidden="true">C</span>
            CONFIIA / Study 02
          </a>
          <span className="session-label">Complete</span>
        </header>
        <section className="completion-grid">
          <div className="completion-card">
            <p className="eyebrow">Thank you</p>
            <h1>Your response is complete.</h1>
            <p className="completion-lead">
              The adviser was pre-programmed rather than live. It was correct on
              four of the six trials. The study tests whether your behavior before
              the trust questions, such as advice uptake, confidence updating,
              response time, and typing friction, predicts your later trust rating.
            </p>
            <p className="completion-privacy">
              Your sentence and raw pointer path were not retained. Only derived
              counts and timing summaries of these inputs are included in your response.
            </p>
            <div className="participant-code">
              <span>Your study code</span>
              <strong>{completion.participantId}</strong>
            </div>
            <SubmissionNotice status={completion.submissionStatus} />
            <div className="download-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  downloadFile(
                    completion.csv,
                    `${completion.participantId}.csv`,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Download CSV
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  downloadFile(
                    completion.json,
                    `${completion.participantId}.json`,
                    "application/json",
                  )
                }
              >
                Download JSON
              </button>
            </div>
            <ProlificCompletion metadata={completion.recruitment} />
          </div>
          <aside className="debrief-card">
            <p className="overview-label">The two-study manuscript</p>
            <p>
              Study 01 estimates whether a one-sentence gain or loss frame changes
              trust in medical AI. Study 02 asks a complementary question: can
              unobtrusive behavior during AI-assisted decisions predict trust
              before people explicitly report it?
            </p>
            <a href={STUDY_ONE_URL} target="_blank" rel="noreferrer">
              View companion Study 01 <span aria-hidden="true">↗</span>
            </a>
          </aside>
        </section>
      </main>
    );
  }

  if (stage === "error") {
    return (
      <main className="study-shell centered-shell">
        <section className="error-card">
          <p className="eyebrow">Unable to start</p>
          <h1>The study did not load correctly.</h1>
          <p>Please check your connection and try once more.</p>
          <button className="primary-button" onClick={() => setStage("running")}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="study-shell landing-shell">
      <header className="study-header">
        <a className="wordmark" href={STUDY_ONE_URL} target="_blank" rel="noreferrer">
          <span className="mark" aria-hidden="true">C</span>
          CONFIIA / Study 02
        </a>
        <div className="pilot-status"><span /> Research pilot</div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Behavior before belief</p>
          <h1>
            Trust, before you <em>say</em> it.
          </h1>
          <p className="hero-summary">
            Make six quick visual decisions with an imperfect AI adviser. We
            study whether small, privacy-preserving behavioral signals anticipate
            your stated trust.
          </p>
          <button
            className="primary-button begin-button"
            onClick={() => setStage("running")}
          >
            Begin study <span aria-hidden="true">→</span>
          </button>
          <p className="eligibility-note">
            For adults aged 18+ · No names requested · About 5 minutes · Mobile or desktop
          </p>
        </div>

        <aside className="study-overview" aria-label="Study overview">
          <span className="overview-index" aria-hidden="true">02</span>
          <p className="overview-label">What to expect</p>
          <ol>
            <li>
              <span>01</span>
              <div><strong>Decide</strong><p>Six brief dot comparisons</p></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>Reconsider</strong><p>See advice and make a final choice</p></div>
            </li>
            <li>
              <span>03</span>
              <div><strong>Reflect</strong><p>One sentence and five trust ratings</p></div>
            </li>
          </ol>
          <div className="overview-meta">
            <div><span>Sensors</span><strong>No camera or microphone</strong></div>
            <div><span>Built with</span><strong>jsPsych 8</strong></div>
          </div>
          <a className="companion-link" href={STUDY_ONE_URL} target="_blank" rel="noreferrer">
            Companion to Study 01 <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </section>

      <footer className="study-footer">
        <p>CONFIIA · Trust and New Forms of AI Integration</p>
        <a href="mailto:amastobiza@ugr.es">Research contact</a>
      </footer>
    </main>
  );
}
