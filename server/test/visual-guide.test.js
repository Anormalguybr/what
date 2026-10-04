import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { decideVisualGuide, extractGeneratedImage, generateVisualGuide } from "../src/visual-guide.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=";
const result = { itemName: "Plastic bottle", category: "plastic", recyclable: true, confidence: 0.8, reason: "Plastic packaging.", cleaningSteps: ["Empty it."], safetyNote: "" };
const config = {
  deepseek: { apiKey: "unit-test-key", baseUrl: "https://api.deepseek.com", model: "deepseek-flash" },
  image: { apiKey: "unit-test-image-key", baseUrl: "https://api.relayrouter.ai/v1", model: "gemini-3.1-flash-lite-image" }
};
const plan = { shouldGenerate: true, title: "Bottle anatomy", prompt: "Draw a simplified bottle with numbered parts.", parts: [{ name: "Bottle body", material: "Estimated plastic", note: "A typical hollow container." }] };

test("gates uncertain and unsupported categories before either provider is called", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("Unexpected network request"); };
  for (const values of [{ confidence: 0.64 }, { category: "unknown", recyclable: null }, { category: "general_waste" }, { category: "organic" }, { recyclable: null }]) {
    const response = await generateVisualGuide({ ...result, ...values }, config);
    assert.equal(response.status, "skipped");
  }
  assert.equal(calls, 0);
  assert.equal(decideVisualGuide({ ...result, category: "electronic" }).type, "safe_disposal");
  assert.equal(decideVisualGuide({ ...result, confidence: 0.65 }).shouldGenerate, true);
});

test("unconfigured image key leaves classification usable without provider requests", async () => {
  globalThis.fetch = async () => { throw new Error("Unexpected request"); };
  assert.equal((await generateVisualGuide(result, { ...config, image: { ...config.image, apiKey: "" } })).status, "unavailable");
});

test("DeepSeek writes the plan before RelayRouter receives a text-only generation request", async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => requests.length === 1
      ? { choices: [{ message: { content: JSON.stringify(plan) } }] }
      : { choices: [{ message: { images: [{ image_url: { url: png } }] } }] } };
  };
  const response = await generateVisualGuide(result, config);
  assert.equal(response.status, "ready");
  assert.equal(response.title, plan.title);
  assert.deepEqual(response.parts, plan.parts);
  assert.match(response.disclaimer, /not a verified/);
  assert.equal(requests[0].url, "https://api.deepseek.com/chat/completions");
  assert.equal(requests[1].url, "https://api.relayrouter.ai/v1/chat/completions");
  assert.equal(requests[1].body.model, "gemini-3.1-flash-lite-image");
  assert.equal(typeof requests[1].body.messages[0].content, "string");
  assert.match(requests[1].body.messages[0].content, /no opening/);
  assert.equal(JSON.stringify(requests).includes("base64,"), false);
});

test("DeepSeek can veto generation and non-English or malformed plans never reach image provider", async () => {
  for (const content of [JSON.stringify({ shouldGenerate: false }), JSON.stringify({ ...plan, title: "\u6750\u6599" }), "bad json"]) {
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) }; };
    if (content.includes("false")) assert.equal((await generateVisualGuide(result, config)).status, "skipped");
    else await assert.rejects(generateVisualGuide(result, config), { code: "VISUAL_INVALID_PLAN" });
    assert.equal(calls, 1);
  }
});

test("parses supported inline image responses and rejects text, remote URLs, SVG and MIME spoofing", () => {
  const base64 = png.split(",")[1];
  for (const message of [
    { content: `![diagram](${png})` },
    { content: [{ type: "image_url", image_url: { url: png } }] },
    { content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: base64 } }] },
    { content: [{ inlineData: { mimeType: "image/png", data: base64 } }] }
  ]) assert.equal(extractGeneratedImage({ choices: [{ message }] }), png);
  assert.equal(extractGeneratedImage({ data: [{ b64_json: base64 }] }), png);
  for (const content of ["image unavailable", "https://api.relayrouter.ai", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,aGVsbG8="]) {
    assert.throws(() => extractGeneratedImage({ choices: [{ message: { content } }] }), { code: "VISUAL_INVALID_IMAGE" });
  }
});

test("provider failures expose safe codes and are not automatically charged twice", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return { ok: false, status: 429 }; };
  await assert.rejects(generateVisualGuide(result, config), { code: "VISUAL_RATE_LIMITED" });
  assert.equal(calls, 1);
});

test("a stalled provider stops at the shared deadline", async () => {
  globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
  await assert.rejects(generateVisualGuide(result, { ...config, timeoutMs: 5 }), { code: "VISUAL_TIMEOUT" });
});
