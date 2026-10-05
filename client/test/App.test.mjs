import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.scrollTo = () => {};
let detailScrolls = [];
dom.window.HTMLElement.prototype.scrollIntoView = function (options) {
  detailScrolls.push({ id: this.id, hidden: this.hidden, options });
};
dom.window.matchMedia = () => ({ matches: false });
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
  detailScrolls = [];
  dom.window.matchMedia = () => ({ matches: false });
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

test("result shows the evidence panel and labelled confidence meter before expansion", async () => {
  await scan();
  assert.ok(document.querySelector(".result-image-card img"));
  assert.equal(document.querySelector(".decision-banner").textContent.includes("Likely recyclable"), true);
  assert.equal(document.querySelectorAll(".decision-trace-item").length, 3);
  assert.equal(document.querySelector(".decision-trace-item").textContent.includes("Item identified"), true);
  assert.equal(document.querySelector(".result-panel").textContent.includes("Decision trace"), true);
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
  assert.deepEqual(detailScrolls, [{ id: "result-details", hidden: false, options: { behavior: "smooth", block: "start" } }]);
  assert.ok(document.querySelector(".steps-list"));
  assert.equal(document.querySelectorAll(".steps-list li").length, classification.cleaningSteps.length);
  await click('input[name="quiz"]');
  await click(".quiz-submit");
  assert.match(document.querySelector(".quiz-feedback").textContent, /Correct/);
  await click(".more-info-button");
  assert.equal(document.querySelector("#result-details").hidden, true);
  assert.equal(detailScrolls.length, 1);
  await click(".back-button");
  assert.ok(document.querySelector(".capture-screen"));
  assert.equal(document.querySelector(".result-screen"), null);
});

test("More information respects reduced motion when navigating to details", async () => {
  dom.window.matchMedia = () => ({ matches: true });
  await scan();
  await click(".more-info-button");
  assert.deepEqual(detailScrolls, [{ id: "result-details", hidden: false, options: { behavior: "auto", block: "start" } }]);
});

test("More information shows curated disposal options when the AI returns them", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      ...classification,
      itemName: "AA battery",
      category: "electronic",
      disposalOptions: [{ title: "Battery collection box", guidance: "Use a DSPA collection box.", precautions: ["Cover the contacts."], location: "Macau collection points", source: { name: "DSPA", url: "https://www.dspa.gov.mo/" } }]
    })
  });
  await scan();
  await click(".more-info-button");
  assert.equal(document.querySelector(".disposal-options-card").textContent.includes("Battery collection box"), true);
  assert.equal(document.querySelector(".disposal-options-card").textContent.includes("Cover the contacts."), true);
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
  assert.equal(document.querySelector(".decision-banner").textContent.includes("Check local rules"), true);
  assert.equal(document.querySelector('[role="meter"]').getAttribute("aria-valuenow"), "0");
});

test("normalizes provider values serialized as strings", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ ...classification, confidence: "0.74", recyclable: "true" })
  });
  await scan();
  assert.equal(document.querySelector(".result-screen").querySelector(".confidence-row").textContent.includes("74%"), true);
  assert.equal(document.querySelector(".decision-banner").textContent.includes("Likely recyclable"), true);
});

test("visual guide loads independently and displays its English material legend", async () => {
  let finish;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    if (url.endsWith("/classify")) return { ok: true, json: async () => ({ ...classification, visualGuide: { status: "pending", scanId: "test-scan" } }) };
    return new Promise((resolve) => { finish = resolve; });
  };
  await scan();
  assert.ok(document.querySelector(".result-screen"));
  assert.ok(document.querySelector("#result-details > .visual-guide"));
  assert.match(document.querySelector(".visual-guide").textContent, /Drawing your material guide/);
  assert.equal(document.querySelector("#result-details").hidden, true);
  await act(async () => finish({ ok: true, json: async () => ({ status: "ready", title: "Bottle anatomy", imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=", parts: [{ name: "Bottle body", material: "Estimated plastic", note: "A simplified container." }] }) }));
  assert.equal(document.querySelector(".visual-guide-image img").getAttribute("alt"), "Simplified educational illustration of Bottle anatomy");
  assert.match(document.querySelector(".material-parts").textContent, /Estimated plastic/);
  assert.match(document.querySelector(".visual-guide").textContent, /AI-generated/);
  assert.equal(calls, 2);
  await click(".more-info-button");
  assert.equal(document.querySelector("#result-details").hidden, false);
  const generatedImage = document.querySelector(".visual-guide-image img");
  await click(".more-info-button");
  assert.equal(document.querySelector("#result-details").hidden, true);
  await click(".more-info-button");
  assert.equal(document.querySelector(".visual-guide-image img"), generatedImage);
  assert.equal(calls, 2);
});

test("skipped guides never call the image endpoint and provider failure preserves classification", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return { ok: true, json: async () => ({ ...classification, visualGuide: { status: "skipped", message: "A clearer photo is needed." } }) }; };
  await scan();
  assert.equal(calls, 1);
  assert.match(document.querySelector(".visual-guide").textContent, /A clearer photo/);
  await click(".scan-again-button");
  globalThis.fetch = async (url) => {
    if (url.endsWith("/classify")) return { ok: true, json: async () => ({ ...classification, visualGuide: { status: "pending", scanId: "test-scan" } }) };
    throw new Error("Image service is down");
  };
  await scan();
  assert.match(document.querySelector(".visual-guide").textContent, /unavailable/);
  assert.match(document.querySelector(".decision-banner").textContent, /Likely recyclable/);
});

test("returning to camera cancels the visual request and ignores a late result", async () => {
  let finish;
  let signal;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/classify")) return { ok: true, json: async () => ({ ...classification, visualGuide: { status: "pending", scanId: "test-scan" } }) };
    signal = options.signal;
    return new Promise((resolve) => { finish = resolve; });
  };
  await scan();
  await click(".back-button");
  assert.equal(signal.aborted, true);
  await act(async () => finish({ ok: true, json: async () => ({ status: "failed", message: "late" }) }));
  assert.equal(document.querySelector(".visual-guide"), null);
  assert.ok(document.querySelector(".capture-screen"));
});

test("invalid illustration responses cannot replace or break the sorting result", async () => {
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url.endsWith("/classify")
    ? { ...classification, visualGuide: { status: "pending", scanId: "test-scan" } }
    : { status: "ready", title: "Bad guide", imageUrl: "https://api.relayrouter.ai", parts: [{ name: "Part" }] } });
  await scan();
  assert.equal(document.querySelector(".visual-guide-image"), null);
  assert.match(document.querySelector(".visual-guide").textContent, /unavailable/);
  assert.match(document.querySelector(".decision-banner").textContent, /Likely recyclable/);
});

test("a broken generated bitmap shows a local failure without losing classification", async () => {
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url.endsWith("/classify")
    ? { ...classification, visualGuide: { status: "pending", scanId: "test-scan" } }
    : { status: "ready", title: "Bottle anatomy", imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=", parts: [{ name: "Body", material: "Estimated plastic", note: "Simplified." }] } });
  await scan();
  await act(async () => document.querySelector(".visual-guide-image img").dispatchEvent(new dom.window.Event("error")));
  assert.match(document.querySelector(".visual-guide").textContent, /could not be displayed/);
  assert.match(document.querySelector(".decision-banner").textContent, /Likely recyclable/);
});

test("the camera can be turned off and on again without leaking the stream", async () => {
  const stopped = [];
  const fakeStream = { getTracks: () => [{ stop: () => stopped.push(true) }] };
  const originalRaf = globalThis.requestAnimationFrame;
  const originalPlay = dom.window.HTMLMediaElement.prototype.play;
  globalThis.requestAnimationFrame = (callback) => { callback(); return 0; };
  dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  Object.defineProperty(dom.window.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => fakeStream }
  });
  try {
    await click('[aria-label="Turn camera on"]');
    assert.ok(document.querySelector('[aria-label="Turn camera off"]'), "camera should report as active once the stream starts");
    assert.equal(document.querySelector(".camera-empty"), null);

    await click('[aria-label="Turn camera off"]');
    assert.ok(document.querySelector('[aria-label="Turn camera on"]'), "camera should report as off after stopping");
    assert.equal(document.querySelector(".camera-empty").textContent.includes("Camera is off"), true);
    assert.ok(stopped.length >= 1, "the camera track must be stopped when turned off");

    await click('[aria-label="Turn camera on"]');
    assert.ok(document.querySelector('[aria-label="Turn camera off"]'), "camera should start again after being turned back on");
  } finally {
    globalThis.requestAnimationFrame = originalRaf;
    dom.window.HTMLMediaElement.prototype.play = originalPlay;
    delete dom.window.navigator.mediaDevices;
  }
});
