export type SubmissionStatus = "sent" | "failed" | "not_configured" | "declined";
export type DataChoice = "send" | "decline";
type PreparedResponse = { payload: Record<string, unknown>; csv: string; json: string };

/** Hold a completed response locally until one explicit, final decision. */
export function createDataDecision(
  response: PreparedResponse,
  configured: boolean,
  send: (payload: Record<string, unknown>) => Promise<void>,
) {
  let pending: PreparedResponse | null = response;
  return async (choice: DataChoice) => {
    if (!pending) return null;
    const selected = pending;
    pending = null;
    return finalizeDataChoice(choice, selected, configured, send);
  };
}

/** A declined choice must never call the sender or return response data. */
export async function finalizeDataChoice(
  choice: DataChoice,
  response: PreparedResponse,
  configured: boolean,
  send: (payload: Record<string, unknown>) => Promise<void>,
): Promise<{ submissionStatus: SubmissionStatus; csv: string; json: string }> {
  if (choice === "decline") {
    return { submissionStatus: "declined", csv: "", json: "" };
  }
  let submissionStatus: SubmissionStatus = "not_configured";
  if (configured) {
    try {
      await send(response.payload);
      submissionStatus = "sent";
    } catch {
      submissionStatus = "failed";
    }
  }
  return { submissionStatus, csv: response.csv, json: response.json };
}

export const PROLIFIC_STUDY_ID = "6ad9d559c9dea36ec4961271";
export const PROLIFIC_COMPLETION_CODE = "C15E3TNE";
export const PROLIFIC_RETURN_URL =
  "https://app.prolific.com/submissions/complete?cc=C15E3TNE";

type ProlificMetadata = {
  prolific_pid: string;
  prolific_study_id: string;
};

export function canReturnToProlific(metadata: ProlificMetadata) {
  return Boolean(metadata.prolific_pid.trim()) && metadata.prolific_study_id === PROLIFIC_STUDY_ID;
}

export function DataChoicePanel({ onChoice, prolificEligible = false }: {
  onChoice: (choice: DataChoice) => void;
  prolificEligible?: boolean;
}) {
  return (
    <section className="data-choice-panel" aria-labelledby="data-choice-heading">
      <h2 id="data-choice-heading">May we use your responses?</h2>
      <p>
        You have completed the study. You can now choose whether to send your
        responses for research.
        {prolificEligible && <> Choosing not to send does not affect your payment
          for completing this study. Both choices let you return to Prolific.</>}
      </p>
      <div className="data-choice-actions">
        <button className="primary-button" onClick={() => onChoice("send")}>
          Send my responses
        </button>
        <button className="secondary-button" onClick={() => onChoice("decline")}>
          Do not send my responses
        </button>
      </div>
    </section>
  );
}

export function SubmissionNotice({ status, prolificEligible = false }: {
  status: SubmissionStatus;
  prolificEligible?: boolean;
}) {
  if (status === "declined") {
    return (
      <p className="submission-success">
        You chose not to send your responses. No study responses were submitted.
        {prolificEligible && <> This choice does not affect your payment for completing the study.</>}
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className="submission-warning" role="alert">
        The browser could not confirm that your response was sent to the research
        spreadsheet. Please download a local copy below and contact the researcher
        if needed. You can still return to Prolific when the button is shown.
      </p>
    );
  }
  if (status === "not_configured") {
    return (
      <p className="submission-warning" role="alert">
        This preview has no research spreadsheet connected. No data were sent;
        you may download a local copy below.
      </p>
    );
  }
  return (
    <p className="submission-success">
      Your response was sent. The browser cannot confirm receipt by the research
      spreadsheet. You may download a local copy below.
    </p>
  );
}

export function ProlificCompletion({ metadata }: { metadata: ProlificMetadata }) {
  if (!canReturnToProlific(metadata)) {
    return null;
  }
  return (
    <section className="prolific-completion" aria-labelledby="prolific-completion-heading">
      <h2 id="prolific-completion-heading">Complete your Prolific submission</h2>
      <p>
        Use the button to return to Prolific. If asked for a completion code, enter{" "}
        <strong className="prolific-code">{PROLIFIC_COMPLETION_CODE}</strong>.
      </p>
      <a className="primary-button" href={PROLIFIC_RETURN_URL}>
        Return to Prolific
      </a>
    </section>
  );
}
