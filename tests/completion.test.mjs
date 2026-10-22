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
const { ProlificCompletion, SubmissionNotice } = exports;
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

test("sent and failed states both retain the return link and accurate submission wording", () => {
  const renderState = (status) => renderToStaticMarkup(createElement(
    "div",
    null,
    createElement(SubmissionNotice, { status }),
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
});

test("page passes captured session metadata only on the completed screen after the debrief", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /const recruitment = recruitmentMetadata\(window\.location\.search\)/);
  assert.match(page, /setCompletion\(\{[\s\S]*?submissionStatus,\s*recruitment,/);
  const complete = page.slice(page.indexOf('if (stage === "complete" && completion)'), page.indexOf('if (stage === "error")'));
  assert.match(complete, /<SubmissionNotice status=\{completion\.submissionStatus\} \/>/);
  assert.match(complete, /<ProlificCompletion metadata=\{completion\.recruitment\} \/>/);
  assert.ok(complete.indexOf("The adviser was pre-programmed") < complete.indexOf("<ProlificCompletion"));
  assert.ok(complete.indexOf("Download JSON") < complete.indexOf("<ProlificCompletion"));
  assert.match(complete, /Your study code[\s\S]*?completion\.participantId/);
  assert.doesNotMatch(source, /window\.location|location\.(assign|replace)|setTimeout/);
});
