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

