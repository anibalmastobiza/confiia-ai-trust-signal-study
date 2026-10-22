import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("app/completion.tsx", root), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const exports = {};
runInNewContext(compiled, { exports, require: createRequire(import.meta.url) });
const { ProlificCompletion, SubmissionNotice, DataChoicePanel, finalizeDataChoice, createDataDecision } = exports;
const correctMetadata = {
  prolific_pid: "test-participant",
  prolific_study_id: "6ad9d559c9dea36ec4961271",
};

function renderReturn(metadata) {
  return renderToStaticMarkup(createElement(ProlificCompletion, { metadata }));
}

test("renders the confirmed Prolific code and a manual return link for the exact study", () => {
  const html = renderReturn(correctMetadata);
  assert.match(html, /Complete your Prolific submission/);
  assert.match(html, />C15E3TNE<\/strong>/);
  assert.match(html, /href="https:\/\/app\.prolific\.com\/submissions\/complete\?cc=C15E3TNE"/);
  assert.match(html, />Return to Prolific<\/a>/);
  assert.doesNotMatch(html, /target=|http-equiv|<script/);
});

test("hides the Prolific return for direct visits, absent PID or a different study ID", () => {
  for (const metadata of [
    { prolific_pid: "", prolific_study_id: "" },
    { ...correctMetadata, prolific_pid: "" },
    { ...correctMetadata, prolific_pid: "   " },
    { ...correctMetadata, prolific_study_id: "" },
    { ...correctMetadata, prolific_study_id: "other-study" },
    { ...correctMetadata, prolific_study_id: "6ad9d559c9dea36ec4961271-extra" },
    { ...correctMetadata, prolific_study_id: "6AD9D559C9DEA36EC4961271" },
  ]) {
    assert.equal(renderReturn(metadata), "");
  }
});

test("sent, failed and declined states retain the same return link and accurate wording", () => {
  const renderState = (status) => renderToStaticMarkup(createElement(
    "div",
    null,
    createElement(SubmissionNotice, { status, prolificEligible: true }),
    createElement(ProlificCompletion, { metadata: correctMetadata }),
  ));
  const sent = renderState("sent");
  assert.match(sent, /Your response was sent/);
  assert.match(sent, /browser cannot confirm receipt/);
  assert.match(sent, /download a local copy/);
  assert.match(sent, /Return to Prolific/);
  assert.doesNotMatch(sent, /role="alert"|stored successfully|saved successfully|Response sent successfully/);
  const failed = renderState("failed");
  assert.match(failed, /role="alert"/);
  assert.match(failed, /could not confirm that your response was sent/);
  assert.match(failed, /download a local copy/);
  assert.match(failed, /Return to Prolific/);
  const preview = renderState("not_configured");
  assert.match(preview, /No data were sent/);
  assert.match(preview, /role="alert"/);
  const declined = renderState("declined");
  assert.match(declined, /No study responses were submitted/);
  assert.match(declined, /does not affect your payment for completing the study/);
  assert.match(declined, /Return to Prolific/);
});

test("page holds responses for a debrief decision and retains captured Prolific metadata", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /const recruitment = recruitmentMetadata\(window\.location\.search\)/);
  assert.match(page, /setCompletion\(\{[\s\S]*?submissionStatus: null,\s*recruitment,/);
  const onFinish = page.slice(page.indexOf('on_finish: () => {'), page.indexOf('const trialOrder ='));
  assert.doesNotMatch(onFinish, /submitStudyData\(|finalizeDataChoice\(|fetch\(/);
  assert.match(onFinish, /setStage\("debrief"\)/);
  assert.match(onFinish, /jsPsych\.data\.reset\(\)/);
  assert.match(page, /pendingDecision\.current = null;[\s\S]*?await decide\(choice\)/);
  assert.match(onFinish, /createDataDecision\([\s\S]*?submitStudyData,/);
  const complete = page.slice(page.indexOf('if ((stage === "debrief"'), page.indexOf('if (stage === "error")'));
  assert.match(complete, /<SubmissionNotice status=\{completion\.submissionStatus\}/);
  assert.match(complete, /<ProlificCompletion metadata=\{completion\.recruitment\} \/>/);
  assert.ok(complete.indexOf("As explained at the start") < complete.indexOf("<DataChoicePanel"));
  assert.ok(complete.indexOf("Download JSON") < complete.indexOf("<ProlificCompletion"));
  assert.match(complete, /stage === "debrief" \? \([\s\S]*?<DataChoicePanel[\s\S]*?: \([\s\S]*?<ProlificCompletion/);
  assert.match(complete, /completion\.submissionStatus !== "declined"/);
  assert.match(complete, /Your study code[\s\S]*?completion\.participantId/);
  const sending = page.slice(page.indexOf('if (stage === "saving")'), page.indexOf('if ((stage === "debrief"'));
  assert.match(sending, /Sending is in progress/);
  assert.match(sending, /<ProlificCompletion metadata=\{completion\.recruitment\} \/>/);
  assert.doesNotMatch(source, /window\.location|location\.(assign|replace)|setTimeout/);
});

test("renders two explicit decisions with equal payment eligibility", () => {
  const chosen = [];
  const panel = DataChoicePanel({ onChoice: (choice) => chosen.push(choice), prolificEligible: true });
  const html = renderToStaticMarkup(panel);
  assert.match(html, /Send my responses/);
  assert.match(html, /Do not send my responses/);
  assert.match(html, /Both choices let you return to Prolific/);
  assert.match(html, /does not affect your payment/);
  const actions = panel.props.children[2].props.children;
  actions[0].props.onClick();
  actions[1].props.onClick();
  assert.deepEqual(chosen, ["send", "decline"]);
  const directVisit = renderToStaticMarkup(createElement(DataChoicePanel, { onChoice: () => {} }));
  assert.doesNotMatch(directVisit, /payment|Prolific/);
});

test("declining performs no submission and returns no response exports", async () => {
  let sends = 0;
  const result = await finalizeDataChoice("decline", {
    payload: { participant_id: "CONFIIA2-test", prolific_pid: "test-pid", item_level_json: "private-responses" },
    csv: "local,csv",
    json: "local-json",
  }, true, async () => { sends += 1; });
  assert.equal(sends, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { submissionStatus: "declined", csv: "", json: "" });
});

test("choosing send delivers the original payload and preserves local recovery on failure", async () => {
  const response = {
    payload: { participant_id: "CONFIIA2-test", prolific_pid: "captured-pid", prolific_study_id: correctMetadata.prolific_study_id, study_version: "1.0.4" },
    csv: "csv-copy",
    json: "json-copy",
  };
  const received = [];
  const sent = await finalizeDataChoice("send", response, true, async (payload) => { received.push(payload); });
  assert.equal(received.length, 1);
  assert.equal(received[0], response.payload);
  assert.equal(sent.submissionStatus, "sent");
  assert.equal(sent.json, "json-copy");
  const failed = await finalizeDataChoice("send", response, true, async () => { throw new Error("offline"); });
  assert.equal(failed.submissionStatus, "failed");
  assert.equal(failed.csv, "csv-copy");
  const preview = await finalizeDataChoice("send", response, false, async () => { throw new Error("must not run"); });
  assert.equal(preview.submissionStatus, "not_configured");
});

test("preparing a response sends nothing and repeated choices cannot cause a second submission", async () => {
  const response = { payload: { prolific_pid: "captured-pid" }, csv: "csv", json: "json" };
  let sends = 0;
  let release;
  const decide = createDataDecision(response, true, async (payload) => {
    assert.equal(payload, response.payload);
    sends += 1;
    await new Promise((resolve) => { release = resolve; });
  });
  assert.equal(sends, 0);
  const sending = decide("send");
  assert.equal(sends, 1);
  assert.equal(await decide("send"), null);
  assert.equal(await decide("decline"), null);
  release();
  assert.equal((await sending).submissionStatus, "sent");
  assert.equal(await decide("send"), null);
  assert.equal(sends, 1);

  const declineFirst = createDataDecision(response, true, async () => { sends += 1; });
  assert.equal((await declineFirst("decline")).submissionStatus, "declined");
  assert.equal(await declineFirst("send"), null);
  assert.equal(sends, 1);
});
