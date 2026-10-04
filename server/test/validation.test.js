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

test("downgrades used tissue-like paper that the model mislabels as recyclable paper", () => {
  const result = validateClassification({
    itemName: "Crumpled used facial tissue",
    category: "paper",
    recyclable: true,
    confidence: 0.87,
    reason: "The image shows a paper-like item.",
    cleaningSteps: ["Do not rinse the tissue."],
    learningFact: "",
    safetyNote: "",
    sourceNeeded: true,
    sources: [],
    quiz: null
  });

  assert.equal(result.category, "general_waste");
  assert.equal(result.recyclable, false);
  assert.equal(result.confidence, 0.59);
});

test("keeps clean paper recyclable when contamination only appears in conditional cleaning advice", () => {
  const result = validateClassification({
    itemName: "Printed Python worksheet (clean A4 paper)",
    category: "paper",
    recyclable: true,
    confidence: 0.82,
    reason: "The item appears clean and dry and matches the supplied clean paper rule.",
    cleaningSteps: ["If the page is wet or greasy, place it in general waste."],
    learningFact: "Clean, dry paper can match a paper recycling stream.",
    safetyNote: "",
    sourceNeeded: true,
    sources: [],
    quiz: null
  });

  assert.equal(result.category, "paper");
  assert.equal(result.recyclable, true);
  assert.equal(result.confidence, 0.82);
});

test("keeps a contradictory general-waste decision conservative", () => {
  const result = validateClassification({
    itemName: "Printed paper worksheet",
    category: "general_waste",
    recyclable: false,
    confidence: 0.59,
    reason: "The printed paper worksheet appears clean and dry with no visible food, grease, or liquid contamination.",
    cleaningSteps: ["Keep the sheet dry."],
    learningFact: "Clean paper can match the paper stream.",
    safetyNote: "",
    sourceNeeded: true,
    sources: [],
    quiz: null
  });

  assert.equal(result.category, "general_waste");
  assert.equal(result.recyclable, false);
  assert.equal(result.confidence, 0.59);
});

test("normalizes disposal options and keeps only approved sources", () => {
  const result = validateClassification(
    {
      itemName: "AA battery",
      category: "electronic",
      recyclable: true,
      confidence: 0.9,
      reason: "Batteries have their own collection scheme.",
      cleaningSteps: [],
      disposalOptions: [
        {
          title: "Battery collection box",
          guidance: "Remove the battery and drop it into a collection box.",
          precautions: ["Do not mix with ordinary recycling.", 42],
          location: "DSPA collection points",
          source: { name: "DSPA battery FAQ", url: "https://www.dspa.gov.mo/richtext2.aspx?a_id=101413" }
        },
        {
          title: "Untrusted channel",
          guidance: "This option should lose its source.",
          precautions: [],
          location: "Unknown",
          source: { name: "Bad", url: "https://untrusted.example/" }
        }
      ],
      learningFact: "",
      safetyNote: "",
      sourceNeeded: false,
      sources: [],
      quiz: null
    },
    [{ name: "DSPA battery FAQ", url: "https://www.dspa.gov.mo/richtext2.aspx?a_id=101413" }]
  );

  assert.equal(result.disposalOptions.length, 2);
  assert.equal(result.disposalOptions[0].title, "Battery collection box");
  assert.deepEqual(result.disposalOptions[0].precautions, ["Do not mix with ordinary recycling."]);
  assert.equal(result.disposalOptions[0].source.url, "https://www.dspa.gov.mo/richtext2.aspx?a_id=101413");
  assert.equal(result.disposalOptions[1].source, null);
});

test("returns an empty disposal options array when none are supplied", () => {
  const result = validateClassification({ itemName: "Item", category: "paper", confidence: 0.6 });
  assert.deepEqual(result.disposalOptions, []);
});
