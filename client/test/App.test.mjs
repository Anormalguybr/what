import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.scrollTo = () => {};
URL.createObjectURL = () => "blob:anonymous-test-image";
URL.revokeObjectURL = () => {};

const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: App } = await import("../node_modules/.cache/ecoscan/App.mjs");

// Synthetic UI fixture only. These tests never contact the AI provider.
const classification = {
  itemName: "Plastic bottle",
  category: "plastic",
  recyclable: true,
  confidence: 0.87,
  reason: "The supplied packaging rule matches this bottle.",
  cleaningSteps: ["Empty the bottle.", "Rinse the bottle."],
  learningFact: "Clean packaging reduces contamination.",
  safetyNote: "Handle sharp edges carefully.",
  sourceNeeded: true,
  sources: [{ name: "DSPA", url: "https://www.dspa.gov.mo/" }],
  quiz: { question: "What should you do first?", options: ["Empty it", "Keep the liquid"], answerIndex: 0, explanation: "Empty the packaging first." }
};

let root;
const originalFetch = globalThis.fetch;
beforeEach(async () => {
  root = createRoot(document.getElementById("root"));
  globalThis.fetch = async () => ({ ok: true, json: async () => classification });
  await act(async () => root.render(createElement(App)));
});
afterEach(async () => {
  await act(async () => root.unmount());
  globalThis.fetch = originalFetch;
});

async function click(selector) {
  const button = document.querySelector(selector);
  assert.ok(button, `Missing control: ${selector}`);
  await act(async () => button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
}

async function selectImage() {
  const input = document.querySelector('input[aria-label="Upload image"]');
  const image = new dom.window.File(["anonymous image"], "anonymous.png", { type: "image/png" });
  Object.defineProperty(input, "files", { configurable: true, value: [image] });
  await act(async () => input.dispatchEvent(new dom.window.Event("change", { bubbles: true })));
}

async function scan() {
  await selectImage();
  await click('[aria-label="Analyze selected item"]');
}

test("summary shows Decision trace and a labelled confidence meter before expansion", async () => {
  await scan();
  assert.equal(document.querySelector(".summary-trace .result-copy").textContent, classification.reason);
  assert.equal(document.querySelectorAll(".summary-trace").length, 1);
  const meter = document.querySelector('[role="meter"]');
  assert.equal(meter.getAttribute("aria-valuenow"), "87");
  assert.equal(meter.getAttribute("aria-label"), "AI confidence estimate");
  assert.equal(meter.firstElementChild.style.width, "87%");
  assert.equal(document.querySelector("#result-details").hidden, true);
  assert.equal(document.querySelector(".more-info-button").getAttribute("aria-expanded"), "false");
});

test("More information toggles details and the quiz still gives learning feedback", async () => {
  await scan();
  await click(".more-info-button");
  assert.equal(document.querySelector("#result-details").hidden, false);
  assert.equal(document.querySelector(".more-info-button").getAttribute("aria-expanded"), "true");
  assert.ok(document.querySelector(".steps-list"));
  await click('input[name="quiz"]');
  await click(".quiz-submit");
  assert.match(document.querySelector(".quiz-feedback").textContent, /Correct/);
  await click(".more-info-button");
  assert.equal(document.querySelector("#result-details").hidden, true);
  await click(".back-button");
  assert.ok(document.querySelector(".capture-screen"));
  assert.equal(document.querySelector(".result-screen"), null);
});

test("returning during Loading aborts the request and ignores its late response", async () => {
  let finish;
  let requestSignal;
  globalThis.fetch = (_url, options) => {
    requestSignal = options.signal;
    return new Promise((resolve) => { finish = resolve; });
  };
  await scan();
  assert.ok(document.querySelector(".loading-screen"));
  await click(".back-button");
  assert.equal(requestSignal.aborted, true);
  await act(async () => finish({ ok: true, json: async () => classification }));
  assert.ok(document.querySelector(".capture-screen"));
  assert.equal(document.querySelector(".result-screen"), null);
});

test("malformed success responses show an error instead of a broken result screen", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ confidence: null }) });
  await scan();
  assert.match(document.querySelector('[role="alert"]').textContent, /invalid result/);
  assert.ok(document.querySelector(".capture-screen"));
});

test("unknown results never display a definitive recyclable status", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ...classification, category: "unknown", recyclable: null, confidence: 0 }) });
  await scan();
  assert.equal(document.querySelector(".recycle-status").textContent, "Check locally");
  assert.equal(document.querySelector('[role="meter"]').getAttribute("aria-valuenow"), "0");
});
