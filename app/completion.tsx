export type SubmissionStatus = "sent" | "failed" | "not_configured";

export const PROLIFIC_STUDY_ID = "6ad9d559c9dea36ec4961271";
export const PROLIFIC_COMPLETION_CODE = "C15E3TNE";
export const PROLIFIC_RETURN_URL =
  "https://app.prolific.com/submissions/complete?cc=C15E3TNE";

type ProlificMetadata = {
  prolific_pid: string;
  prolific_study_id: string;
};

export function SubmissionNotice({ status }: { status: SubmissionStatus }) {
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
  if (!metadata.prolific_pid.trim() || metadata.prolific_study_id !== PROLIFIC_STUDY_ID) {
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
