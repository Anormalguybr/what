import test from "node:test";
import assert from "node:assert/strict";
import { validateClassification } from "../src/validation.js";

test("normalizes a valid classification response", () => {
  const result = validateClassification({
    itemName: "Bottle",
    category: "plastic",
    recyclable: true,
    confidence: 0.8,
    reason: "It appears to be plastic packaging.",
    cleaningSteps: ["Rinse it."],
    learningFact: "Sorting keeps materials in use.",
    safetyNote: "",
    sourceNeeded: true,
    sources: [{ name: "DSPA", url: "https://www.dspa.gov.mo/" }],
    quiz: {
      question: "What should you do first?",
      options: ["Rinse it", "Hide it"],
      answerIndex: 0,
      explanation: "Clean packaging is easier to sort."
    }
  });

  assert.equal(result.category, "plastic");
  assert.equal(result.quiz.answerIndex, 0);
});

test("rejects an unknown category", () => {
  assert.throws(
    () => validateClassification({ itemName: "Item", category: "maybe", confidence: 0.5 }),
    /invalid category/
  );
});

test("forces unknown items to be non-decisive and filters sources", () => {
  const result = validateClassification(
    {
      itemName: "Unclear item",
      category: "unknown",
      recyclable: true,
      confidence: 0.2,
      sourceNeeded: false,
      sources: [
        { name: "Approved source", url: "https://www.dspa.gov.mo/" },
        { name: "Unapproved source", url: "https://untrusted.example/" }
      ],
      quiz: { question: "", options: ["A", "B"], answerIndex: 0, explanation: "" }
    },
    [{ name: "DSPA", url: "https://www.dspa.gov.mo/" }]
  );

  assert.equal(result.recyclable, null);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sourceNeeded, false);
  assert.equal(result.quiz, null);
});
