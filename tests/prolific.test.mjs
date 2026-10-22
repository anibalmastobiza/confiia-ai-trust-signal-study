import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const recruitmentSource = await readFile(new URL("app/recruitment.ts", root), "utf8");
const compiled = ts.transpileModule(recruitmentSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { recruitmentMetadata } = await import(
  `data:text/javascript,${encodeURIComponent(compiled)}`
);
const collector = await readFile(new URL("google-apps-script/Code.gs", root), "utf8");
const prolificHeaders = ["prolific_pid", "prolific_study_id", "prolific_session_id"];

test("captures URL-decoded Prolific IDs separately from internal identifiers", () => {
  const metadata = recruitmentMetadata(
    "?PROLIFIC_PID=p%2Bid&STUDY_ID=platform%20study&SESSION_ID=session%2F1",
  );
  assert.deepEqual(metadata, {
    recruitment_id: "",
    recruitment_source: "prolific",
    assigned_study: "",
    prolific_pid: "p+id",
    prolific_study_id: "platform study",
    prolific_session_id: "session/1",
  });
  assert.equal("participant_id" in metadata, false);
  assert.equal("study_id" in metadata, false);
  assert.equal("submission_id" in metadata, false);
});

test("direct visits remain blank and an explicit source takes precedence", () => {
  const empty = recruitmentMetadata("");
  assert.ok(Object.values(empty).every((value) => value === ""));
  const routed = recruitmentMetadata(
    "?PROLIFIC_PID=pid&rid=allocation&source=confiia-unified-recruitment&assigned_study=study02",
  );
  assert.equal(routed.recruitment_id, "allocation");
  assert.equal(routed.recruitment_source, "confiia-unified-recruitment");
  assert.equal(routed.assigned_study, "study02");
  assert.equal(recruitmentMetadata("?PROLIFIC_PID=pid&source=").recruitment_source, "prolific");
  assert.equal(recruitmentMetadata("?STUDY_ID=only-study").recruitment_source, "");
  assert.equal(recruitmentMetadata("?assigned_study=other").assigned_study, "");
});

test("bounds metadata after URL decoding and tolerates malformed encoding", () => {
  const long = "%61".repeat(200);
  const metadata = recruitmentMetadata(
    `?PROLIFIC_PID=${long}&STUDY_ID=${long}&SESSION_ID=${long}&rid=${long}&source=${long}`,
  );
  for (const key of [...prolificHeaders, "recruitment_id"]) {
    assert.equal(metadata[key], "a".repeat(128));
  }
  assert.equal(metadata.recruitment_source, "a".repeat(80));
  assert.doesNotThrow(() => recruitmentMetadata("?PROLIFIC_PID=%E0%A4%A&SESSION_ID=%"));
});

test("page wiring includes session metadata in the payload and jsPsych properties", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /recruitmentMetadata\(window\.location\.search\)/);
  assert.match(page, /item_level_json: JSON\.stringify\(itemRows\),\s*\.\.\.recruitment/);
  assert.match(page, /jsPsych\.data\.addProperties\(\{[\s\S]*?\.\.\.recruitment,\s*\}\)/);
  assert.match(page, /csv: data\.csv\(\),\s*json: data\.json\(\)/);
  assert.match(page, /const STUDY_VERSION = "1\.0\.3"/);
});

function mockSheet(initialRows = []) {
  const rows = initialRows.map((row) => [...row]);
  let maxColumns = Math.max(26, ...rows.map((row) => row.length));
  const insertions = [];
  return {
    rows,
    insertions,
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map((row) => row.length)),
    getMaxColumns: () => maxColumns,
    insertColumnsAfter(after, count) {
      assert.equal(after, maxColumns);
      insertions.push({ after, count });
      maxColumns += count;
    },
    getName: () => "Study02_Responses",
    setFrozenRows() {},
    autoResizeColumns() {},
    appendRow(row) { rows.push(Array.from(row)); },
    getRange(row, column, rowCount, columnCount) {
      assert.ok(column + columnCount - 1 <= maxColumns, "range exceeds the sheet grid");
      const range = {
        setValues(values) {
          assert.equal(values.length, rowCount);
          values.forEach((valuesRow, rowOffset) => {
            assert.equal(valuesRow.length, columnCount);
            rows[row - 1 + rowOffset] ??= [];
            valuesRow.forEach((value, columnOffset) => {
              rows[row - 1 + rowOffset][column - 1 + columnOffset] = value;
            });
          });
          return range;
        },
        setFontWeight() { return range; },
        setBackground() { return range; },
        setFontColor() { return range; },
        createTextFinder(value) {
          return {
            matchEntireCell(entire) {
              assert.equal(entire, true);
              return this;
            },
            findNext() {
              return rows.slice(row - 1, row - 1 + rowCount)
                .some((values) => String(values[column - 1]) === value) ? {} : null;
            },
          };
        },
      };
      return range;
    },
  };
}

function collectorHarness(initialRows = []) {
  const responseSheet = mockSheet(initialRows);
  const sheets = new Map([["Study02_Responses", responseSheet]]);
  let releases = 0;
  const api = runInNewContext(`${collector}\n({ HEADERS, doPost, setupResponses });`, {
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => sheets.get(name),
        insertSheet: (name) => {
          const sheet = mockSheet();
          sheets.set(name, sheet);
          return sheet;
        },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: (ms) => assert.equal(ms, 30000),
        releaseLock: () => { releases += 1; },
      }),
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text) => ({
        setMimeType: () => JSON.parse(text),
      }),
    },
  });
  return {
    headers: Array.from(api.HEADERS),
    sheet: responseSheet,
    sheets,
    releases: () => releases,
    setup: api.setupResponses,
    post: (payload) => api.doPost({ postData: { contents: JSON.stringify(payload) } }),
  };
}

const studyId = "confiia_ai_trust_behavioral_signals";

test("migrates old headers by appending columns and preserves existing responses", () => {
  const headers = collectorHarness().headers;
  assert.deepEqual(headers.slice(-3), prolificHeaders);
  const legacyHeaders = headers.slice(0, -3);
  const oldRow = legacyHeaders.map((header) => header === "submission_id" ? "old-id" : `old-${header}`);
  const harness = collectorHarness([legacyHeaders, oldRow]);
  assert.deepEqual(harness.post({
    study_id: studyId,
    submission_id: "new-id",
    participant_id: "CONFIIA2-INTERNAL",
    ...recruitmentMetadata("?PROLIFIC_PID=p1&STUDY_ID=platform-study&SESSION_ID=s1"),
  }), { ok: true, duplicate: false });
  assert.deepEqual(harness.sheet.rows[0], headers);
  assert.deepEqual(harness.sheet.rows[1], oldRow);
  assert.deepEqual(harness.sheet.insertions, [{ after: legacyHeaders.length, count: 3 }]);
  assert.equal(harness.sheet.getMaxColumns(), headers.length);
  const newRow = Object.fromEntries(headers.map((key, index) => [key, harness.sheet.rows[2][index]]));
  assert.equal(newRow.participant_id, "CONFIIA2-INTERNAL");
  assert.equal(newRow.study_id, studyId);
  assert.equal(newRow.prolific_pid, "p1");
  assert.equal(newRow.prolific_study_id, "platform-study");
  assert.equal(newRow.prolific_session_id, "s1");
  const afterMigration = harness.sheet.rows.map((row) => [...row]);
  harness.setup();
  assert.deepEqual(harness.sheet.rows, afterMigration);
  assert.equal(harness.sheet.insertions.length, 1);
  assert.equal(harness.releases(), 1);
});

test("duplicate submissions preserve the first record and legacy payloads get blank IDs", () => {
  const harness = collectorHarness();
  const payload = { study_id: studyId, submission_id: "same-id", prolific_pid: "first-pid" };
  assert.deepEqual(harness.post(payload), { ok: true, duplicate: false });
  const originalRows = harness.sheet.rows.map((row) => [...row]);
  assert.deepEqual(harness.post({ ...payload, prolific_pid: "changed-pid" }), { ok: true, duplicate: true });
  assert.deepEqual(harness.sheet.rows, originalRows);
  assert.deepEqual(harness.post({ study_id: studyId, submission_id: "legacy-id" }), { ok: true, duplicate: false });
  assert.deepEqual(harness.sheet.rows[2].slice(-3), ["", "", ""]);
  assert.equal(harness.releases(), 3);
});

test("collector preserves formula protection and router assignment behavior", () => {
  const harness = collectorHarness();
  harness.post({ study_id: studyId, submission_id: "formula-id", prolific_pid: "=1+1" });
  assert.equal(harness.sheet.rows[1].at(-3), "'=1+1");
  const assignment = {
    study_id: "confiia_ai_trust_recruitment_router",
    assignment_id: "routing-id",
    assigned_study: "study02",
    router_version: "1.0.0",
    source: "confiia-unified-recruitment",
  };
  assert.deepEqual(harness.post(assignment), { ok: true, duplicate: false, assigned_study: "study02" });
  assert.deepEqual(harness.post(assignment), { ok: true, duplicate: true, assigned_study: "study02" });
  const routerRows = harness.sheets.get("Recruitment_Assignments").rows;
  assert.equal(routerRows.length, 2);
  assert.equal(routerRows[1][routerRows[0].indexOf("assigned_url")], "https://anibalmastobiza.github.io/confiia-ai-trust-signal-study/");
});
