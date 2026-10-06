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

test("recycling point finder lists channels, opens one and filters by area", async () => {
  const calls = [];
  const channelSummary = { id: "glass", name: "Glass bottles", nameZh: "玻璃樽", accepts: ["glass"], note: "Rinse first.", officialFinder: "https://example.org/glass", sourceIds: ["s1"], count: 2, regions: { macau: 1, taipa: 0, coloane: 1 } };
  const locations = [{ id: "g1", name: "Park bin", address: "Park Road 1", region: "macau" }, { id: "g2", name: "Beach bin", address: "Beach Road 2", region: "coloane" }];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/recycling-points")) {
      return { ok: true, json: async () => ({ accessed: "2026-10-06", sourceNote: "Captured from DSPA.", total: 2, channels: [channelSummary], sources: [{ id: "s1", name: "DSPA", url: "https://example.org/glass" }] }) };
    }
    return { ok: true, json: async () => ({ channel: channelSummary, total: 2, limit: 60, offset: 0, locations, sources: [{ id: "s1", name: "DSPA", url: "https://example.org/glass" }] }) };
  };

  await click('[aria-label="Find recycling points"]');
  assert.ok(document.querySelector(".points-screen"));
  assert.equal(document.querySelector(".points-channel-card").textContent.includes("Glass bottles"), true);
  assert.match(document.querySelector(".points-channel-card").textContent, /2 points/);

  await click(".points-open");
  assert.equal(document.querySelectorAll(".points-item").length, 2);
  assert.match(document.querySelector(".points-meta").textContent, /Captured from the DSPA website/);

  const tabs = document.querySelectorAll(".points-region-tab");
  await click(`.points-region-tab:nth-child(${2})`);
  assert.ok(calls.some((url) => url.includes("/api/recycling-points/glass") && url.includes("region=macau")), "expected a region-filtered request");
  assert.ok(tabs.length >= 4);

  await click(".back-button");
  assert.ok(document.querySelector(".points-channel-card"));
  await click(".back-button");
  assert.ok(document.querySelector(".capture-screen"));
  assert.equal(document.querySelector(".points-screen"), null);
});

test("nearest points use the device location and show distances", async () => {
  Object.defineProperty(dom.window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: (success) => success({ coords: { latitude: 22.2, longitude: 113.55 } }) }
  });
  const channelSummary = { id: "eco-fun-stations", name: "Eco Fun stations", nameZh: "環保加Fun站", accepts: ["plastic"], note: "n", officialFinder: "https://example.org", sourceIds: ["s1"], count: 1, located: 1, regions: { macau: 1, taipa: 0, coloane: 0 } };
  globalThis.fetch = async (url) => {
    if (String(url).includes("/recycling-points/nearby")) {
      return { ok: true, json: async () => ({ origin: { latitude: 22.2, longitude: 113.55 }, locatedTotal: 1, coordinateNote: "Only the Eco Fun network publishes official coordinates.", total: 1, locations: [{ channelId: "eco-fun-stations", channelName: "Eco Fun stations", id: "eco-fun-stations-001", name: "Eco Fun station (Patane)", address: "Patane Road", region: "macau", distanceMeters: 120 }] }) };
    }
    if (String(url).endsWith("/api/recycling-points")) return { ok: true, json: async () => ({ accessed: "2026-10-06", total: 1, channels: [channelSummary], sources: [] }) };
    return { ok: true, json: async () => ({ channel: channelSummary, total: 0, limit: 60, offset: 0, locations: [], sources: [] }) };
  };
  try {
    await click('[aria-label="Find recycling points"]');
    await click(".points-near");
    await act(async () => {});
    const panel = document.querySelector(".points-nearby");
    assert.ok(panel, "nearby panel should render");
    assert.match(panel.textContent, /120 m away/);
    assert.match(panel.textContent, /Eco Fun station \(Patane\)/);
    assert.match(panel.textContent, /Only the Eco Fun network/);
    await click(".points-nearby-clear");
    assert.equal(document.querySelector(".points-nearby"), null);
  } finally {
    delete dom.window.navigator.geolocation;
  }
});

test("denied location shows guidance and keeps the manual list", async () => {
  Object.defineProperty(dom.window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: (_success, error) => error({ code: 1 }) }
  });
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/recycling-points")) return { ok: true, json: async () => ({ accessed: "2026-10-06", total: 0, channels: [], sources: [] }) };
    return { ok: true, json: async () => ({}) };
  };
  try {
    await click('[aria-label="Find recycling points"]');
    await click(".points-near");
    await act(async () => {});
    const alert = document.querySelector(".points-alert");
    assert.ok(alert, "a location error should be announced");
    assert.match(alert.textContent, /permission was denied/i);
    assert.equal(document.querySelector(".points-nearby"), null);
    assert.ok(document.querySelector(".points-screen"));
  } finally {
    delete dom.window.navigator.geolocation;
  }
});

test("a recyclable scan result links straight to drop-off points", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/classify")) return { ok: true, json: async () => classification };
    if (String(url).endsWith("/api/recycling-points")) return { ok: true, json: async () => ({ accessed: "2026-10-06", total: 0, channels: [], sources: [] }) };
    return { ok: true, json: async () => ({ channel: { id: "eco-fun-stations", name: "Eco Fun stations", accepts: ["plastic"], count: 0, regions: { macau: 0, taipa: 0, coloane: 0 } }, total: 0, limit: 60, offset: 0, locations: [], sources: [] }) };
  };
  await scan();
  const link = document.querySelector(".points-link-button");
  assert.ok(link, "recyclable results should offer a drop-off link");
  await click(".points-link-button");
  assert.ok(document.querySelector(".points-screen"));
  assert.ok(calls.some((url) => url.includes("/api/recycling-points/eco-fun-stations")), "expected a channel-scoped request");
});

test("after a scan the result page shows the nearest point that accepts the item", async () => {
  Object.defineProperty(dom.window.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: (success) => success({ coords: { latitude: 22.19, longitude: 113.54 } }) }
  });
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/classify")) return { ok: true, json: async () => classification };
    if (String(url).includes("/recycling-points/nearby")) return { ok: true, json: async () => ({ category: "plastic", stream: "plastic", total: 1, coordinateNote: "Only the Eco Fun network publishes official coordinates.", locations: [{ channelId: "eco-fun-stations", channelName: "Eco Fun stations", id: "eco-fun-stations-002", name: "Eco Fun station (Patane)", address: "Patane Road", region: "macau", distanceMeters: 210 }] }) };
    return { ok: true, json: async () => ({}) };
  };
  try {
    await scan();
    await act(async () => {});
    const panel = document.querySelector(".nearest-point");
    assert.ok(panel, "the nearest section should render after a recyclable scan");
    assert.match(panel.textContent, /Where to take it/);
    assert.match(panel.textContent, /210 m/);
    assert.match(panel.textContent, /Eco Fun station \(Patane\)/);
    assert.ok(calls.some((url) => url.includes("/recycling-points/nearby") && url.includes("category=plastic")), "the nearby request must carry the scanned category");
  } finally {
    delete dom.window.navigator.geolocation;
  }
});

test("a non-recyclable scan does not show drop-off suggestions", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ...classification, category: "general_waste", recyclable: false }) });
  await scan();
  await act(async () => {});
  assert.equal(document.querySelector(".nearest-point"), null);
});

test("the result shows the suggested Macau bin from the server", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      ...classification,
      suggestedBin: {
        category: "plastic",
        name: "Public three-colour recycling bin - plastic bottles",
        nameZh: "三色資源回收桶 - 膠樽",
        guidance: "Empty and rinse the bottle.",
        image: "/api/bin-images/three-colour-bins.png",
        imageAlt: "Public three-colour recycling bin - plastic bottles in Macau",
        imageCredit: { text: "Macao SAR Environmental Protection Bureau (DSPA)", url: "https://www.dspa.gov.mo/richtext_buildings.aspx?a_id=1578363446", accessed: "2026-10-06" },
        sources: [{ name: "DSPA", url: "https://www.dspa.gov.mo/RecycleIndexPage.aspx" }]
      }
    })
  });
  await scan();
  const card = document.querySelector(".bin-suggestion");
  assert.ok(card, "the suggested bin card should render");
  assert.match(card.textContent, /Suggested Macau bin/);
  assert.match(card.textContent, /plastic bottles/);
  assert.match(card.textContent, /三色資源回收桶/);
  assert.match(card.textContent, /Empty and rinse the bottle/);
  const photo = card.querySelector(".bin-suggestion-media img");
  assert.ok(photo, "the bin photo should render");
  assert.equal(photo.getAttribute("src"), "/api/bin-images/three-colour-bins.png");
  assert.match(photo.getAttribute("alt"), /Macau/);
  assert.match(card.querySelector(".bin-photo-credit").textContent, /DSPA/);
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
