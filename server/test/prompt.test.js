import assert from "node:assert/strict";
import test from "node:test";
import { buildSystemPrompt } from "../src/prompt.js";

const rules = { sources: [{ id: "s", name: "DSPA", url: "https://www.dspa.gov.mo/" }], rules: [] };

test("prompt identifies the item before applying the Macau recycling decision", () => {
  const prompt = buildSystemPrompt(rules);
  assert.match(prompt, /Step 1 - Identify/);
  assert.match(prompt, /Step 3 - Decide the category/);
  assert.match(prompt, /everyday packaging/);
  assert.match(prompt, /Return "unknown" only when/);
});

test("prompt keeps the honesty guardrails and the response contract", () => {
  const prompt = buildSystemPrompt(rules);
  assert.match(prompt, /Never invent carbon, energy, or savings numbers/);
  assert.match(prompt, /Never invent a channel, location, or source/);
  assert.match(prompt, /Do not treat furniture, appliances, tools, or decorative objects as packaging/);
  for (const field of ["itemName", "category", "recyclable", "confidence", "cleaningSteps", "disposalOptions", "sources", "quiz"]) {
    assert.ok(prompt.includes(field), `prompt should mention ${field}`);
  }
  assert.ok(prompt.includes("https://www.dspa.gov.mo/"), "prompt should embed the supplied sources");
});
