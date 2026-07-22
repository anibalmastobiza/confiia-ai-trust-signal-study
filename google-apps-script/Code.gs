const SPREADSHEET_ID = "1zQQUAwmle48n9EpFc3W7czXHZ687-pss_ggglCbKtgM";
const SHEET_NAME = "Study02_Responses";
const STUDY_ID = "confiia_ai_trust_behavioral_signals";
const ROUTER_SHEET_NAME = "Recruitment_Assignments";
const ROUTER_STUDY_ID = "confiia_ai_trust_recruitment_router";

const ROUTER_DESTINATIONS = {
  study01: "https://anibalmastobiza.github.io/confiia-ai-trust-framing-study/",
  study02: "https://anibalmastobiza.github.io/confiia-ai-trust-signal-study/",
};

const ROUTER_HEADERS = [
  "server_received_utc",
  "study_id",
  "router_version",
  "assignment_id",
  "assigned_study",
  "assigned_url",
  "assigned_at_utc",
  "source",
];

const HEADERS = [
  "server_received_utc",
  "study_id",
  "study_version",
  "submission_id",
  "participant_id",
  "jspsych_version",
  "session_started_utc",
  "session_completed_utc",
  "total_elapsed_ms",
  "viewport_bucket",
  "coarse_pointer",
  "trial_order",
  "initial_accuracy",
  "final_accuracy",
  "ai_alignment_rate",
  "disagreement_trials",
  "switched_toward_ai_rate",
  "switched_away_ai_rate",
  "rair",
  "rsr",
  "appropriate_reliance_score",
  "mean_initial_confidence",
  "mean_final_confidence",
  "mean_confidence_change",
  "mean_ai_confidence_shift",
  "mean_initial_rt_ms",
  "mean_advice_rt_ms",
  "ai_alignment_fluency_ms",
  "mean_pointer_path_px",
  "typing_key_count",
  "typing_printable_count",
  "typing_backspace_count",
  "typing_backspace_rate",
  "typing_first_key_latency_ms",
  "typing_mean_iki_ms",
  "typing_median_iki_ms",
  "typing_pause_count_1000ms",
  "typing_pause_time_ms",
  "typing_duration_ms",
  "typing_wpm",
  "typing_input_events",
  "typing_paste_events",
  "text_word_count",
  "text_conditional_count",
  "text_hedge_count",
  "text_human_agency_count",
  "text_ai_reference_count",
  "text_verification_count",
  "stias_confident",
  "stias_reliable",
  "stias_trust",
  "common_primary_trust",
  "common_comfort",
  "stias_index",
  "common_trust_index",
  "ai_familiarity",
  "ai_use_frequency",
  "english_comfort",
  "input_method",
  "previous_confiia_study",
  "age_band",
  "sex_assigned_at_birth",
  "consent_rt_ms",
  "reasoning_rt_ms",
  "trust_rt_ms",
  "background_rt_ms",
  "item_level_json",
  "recruitment_id",
  "recruitment_source",
  "assigned_study",
];

function doGet() {
  return jsonResponse_({
    ok: true,
    study_id: STUDY_ID,
    router_study_id: ROUTER_STUDY_ID,
    message: "CONFIIA Study 02 and recruitment assignment collector is running.",
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing request body.");
    }

    const payload = JSON.parse(e.postData.contents);
    if (payload.study_id === ROUTER_STUDY_ID) {
      return saveRouterAssignment_(payload);
    }
    if (payload.study_id !== STUDY_ID) throw new Error("Unknown study_id.");
    if (!payload.submission_id) {
      throw new Error("Missing submission_id.");
    }

    const sheet = getResponseSheet_();
    const record = Object.assign(
      { server_received_utc: new Date().toISOString() },
      payload,
    );
    const duplicate = appendUnique_(
      sheet,
      HEADERS,
      "submission_id",
      payload.submission_id,
      record,
    );

    return jsonResponse_({ ok: true, duplicate: duplicate });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  } finally {
    lock.releaseLock();
  }
}

function setupResponses() {
  return getResponseSheet_().getName();
}

function setupRecruitmentAssignments() {
  return getRouterSheet_().getName();
}

function getResponseSheet_() {
  return getNamedSheet_(SHEET_NAME, HEADERS);
}

function getRouterSheet_() {
  return getNamedSheet_(ROUTER_SHEET_NAME, ROUTER_HEADERS);
}

function getNamedSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#102d3f")
      .setFontColor("#ffffff");
    sheet.autoResizeColumns(1, headers.length);
  } else if (sheet.getLastColumn() < headers.length) {
    const firstNewColumn = sheet.getLastColumn() + 1;
    const missingHeaders = headers.slice(firstNewColumn - 1);
    sheet
      .getRange(1, firstNewColumn, 1, missingHeaders.length)
      .setValues([missingHeaders])
      .setFontWeight("bold")
      .setBackground("#102d3f")
      .setFontColor("#ffffff");
    sheet.autoResizeColumns(firstNewColumn, missingHeaders.length);
  }

  return sheet;
}

function saveRouterAssignment_(payload) {
  if (!payload.assignment_id) throw new Error("Missing assignment_id.");
  if (!ROUTER_DESTINATIONS[payload.assigned_study]) {
    throw new Error("Unknown assigned_study.");
  }

  const record = {
    server_received_utc: new Date().toISOString(),
    study_id: ROUTER_STUDY_ID,
    router_version: payload.router_version,
    assignment_id: payload.assignment_id,
    assigned_study: payload.assigned_study,
    assigned_url: ROUTER_DESTINATIONS[payload.assigned_study],
    assigned_at_utc: payload.assigned_at_utc,
    source: payload.source,
  };
  const duplicate = appendUnique_(
    getRouterSheet_(),
    ROUTER_HEADERS,
    "assignment_id",
    payload.assignment_id,
    record,
  );

  return jsonResponse_({
    ok: true,
    duplicate: duplicate,
    assigned_study: payload.assigned_study,
  });
}

function appendUnique_(sheet, headers, idHeader, idValue, record) {
  const idColumn = headers.indexOf(idHeader) + 1;
  const existingRows = sheet.getLastRow() - 1;

  if (existingRows > 0) {
    const duplicate = sheet
      .getRange(2, idColumn, existingRows, 1)
      .createTextFinder(String(idValue))
      .matchEntireCell(true)
      .findNext();
    if (duplicate) return true;
  }

  sheet.appendRow(
    headers.map(function (header) {
      return safeCell_(record[header]);
    }),
  );
  return false;
}

function safeCell_(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return "'" + value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
