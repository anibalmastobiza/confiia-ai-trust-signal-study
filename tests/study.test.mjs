import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const projectRoot = new URL("../", import.meta.url);

test("implements CONFIIA Study 02 as a five-minute jsPsych advice task", async () => {
  const page = await readFile(new URL("app/page.tsx", projectRoot), "utf8");

  assert.match(page, /CONFIIA \/ Study 02/);
  assert.match(page, /About 5 minutes/);
  assert.match(page, /import\("jspsych"\)/);
  assert.match(page, /DOT_TRIALS/);
  assert.equal((page.match(/id: "dots_\d\d"/g) ?? []).length, 6);
  assert.match(page, /switched_toward_ai_rate/);
  assert.match(page, /mean_ai_confidence_shift/);
  assert.match(page, /stias_index/);
  assert.match(page, /common_trust_index/);
});

test("keeps the behavioral sensing privacy-preserving", async () => {
  const page = await readFile(new URL("app/page.tsx", projectRoot), "utf8");

  assert.match(page, /\[discarded after local extraction\]/);
  assert.match(page, /Raw pointer paths and individual keys are not stored/);
  assert.match(page, /typing_backspace_rate/);
  assert.match(page, /text_verification_count/);
  assert.doesNotMatch(page, /navigator\.mediaDevices|getUserMedia|webcam|microphone.*permission/i);
});

test("supports responsive mobile and desktop participation", async () => {
  const [styles, html] = await Promise.all([
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
    readFile(new URL("index.html", projectRoot), "utf8"),
  ]);

  assert.match(styles, /min-height:\s*100dvh/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /pointer:\s*coarse/);
  assert.match(styles, /grid-template-columns:\s*1fr 1fr/);
  assert.match(html, /viewport-fit=cover/);
});

test("includes Google Sheets collection and GitHub Pages deployment", async () => {
  const [collector, workflow, viteConfig] = await Promise.all([
    readFile(new URL("google-apps-script/Code.gs", projectRoot), "utf8"),
    readFile(new URL(".github/workflows/deploy-pages.yml", projectRoot), "utf8"),
    readFile(new URL("vite.config.ts", projectRoot), "utf8"),
  ]);

  assert.match(collector, /Study02_Responses/);
  assert.match(collector, /function doPost/);
  assert.match(collector, /LockService\.getScriptLock/);
  assert.match(collector, /item_level_json/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /VITE_DATA_ENDPOINT/);
  assert.match(viteConfig, /confiia-ai-trust-signal-study/);
});

test("ships the research and analysis materials", async () => {
  await Promise.all([
    access(new URL("research/RESEARCH_BRIEF.md", projectRoot)),
    access(new URL("research/PREREGISTRATION.md", projectRoot)),
    access(new URL("research/DATA_DICTIONARY.md", projectRoot)),
    access(new URL("analysis/analysis.py", projectRoot)),
  ]);
});
