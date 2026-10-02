import test from "node:test";
import assert from "node:assert/strict";
import { classifyWithDeepSeek } from "../src/deepseek.js";

test("retries once when the provider returns an empty response", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }) };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                itemName: "Bottle",
                category: "plastic",
                recyclable: true,
                confidence: 0.8,
                reason: "Plastic packaging.",
                cleaningSteps: ["Rinse it."],
                learningFact: "Sorting keeps materials in use.",
                safetyNote: "",
                sourceNeeded: true,
                sources: [],
                quiz: null
              })
            }
          }
        ]
      })
    };
  };

  try {
    const result = await classifyWithDeepSeek({
      imageBuffer: Buffer.from("image"),
      mimeType: "image/png",
      apiKey: "test-key",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-flash",
      rules: { sources: [], rules: [] }
    });
    assert.equal(result.itemName, "Bottle");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
