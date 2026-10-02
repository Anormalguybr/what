const CATEGORIES = new Set([
  "plastic",
  "paper",
  "metal",
  "glass",
  "organic",
  "electronic",
  "general_waste",
  "unknown"
]);

export function validateClassification(value, allowedSources = []) {
  if (!value || typeof value !== "object") {
    throw new Error("The AI response is not an object.");
  }

  const confidence = Number(value.confidence);
  const cleaningSteps = Array.isArray(value.cleaningSteps)
    ? value.cleaningSteps.filter((step) => typeof step === "string").slice(0, 4)
    : [];
  const sources = Array.isArray(value.sources)
    ? value.sources
        .filter((source) => source && typeof source.name === "string" && typeof source.url === "string")
        .filter((source) => isAllowedSource(source, allowedSources))
        .slice(0, 4)
    : [];

  if (typeof value.itemName !== "string" || !value.itemName.trim()) {
    throw new Error("The AI response has no item name.");
  }
  if (!CATEGORIES.has(value.category)) {
    throw new Error("The AI response has an invalid category.");
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("The AI response has an invalid confidence value.");
  }

  return {
    itemName: value.itemName.trim().slice(0, 120),
    category: value.category,
    recyclable: value.category === "unknown" ? null : typeof value.recyclable === "boolean" ? value.recyclable : null,
    confidence,
    reason: typeof value.reason === "string" ? value.reason.trim().slice(0, 600) : "",
    cleaningSteps,
    learningFact: typeof value.learningFact === "string" ? value.learningFact.trim().slice(0, 400) : "",
    safetyNote: typeof value.safetyNote === "string" ? value.safetyNote.trim().slice(0, 400) : "",
    sourceNeeded: sources.length === 0 || value.sourceNeeded !== false,
    sources,
    quiz: normalizeQuiz(value.quiz)
  };
}

function isAllowedSource(source, allowedSources) {
  if (!allowedSources.length) return true;
  return allowedSources.some((allowed) => allowed && allowed.url === source.url);
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== "object" || !Array.isArray(quiz.options)) {
    return null;
  }

  const options = quiz.options.filter((option) => typeof option === "string").slice(0, 4);
  const answerIndex = Number(quiz.answerIndex);
  if (
    typeof quiz.question !== "string" ||
    !quiz.question.trim() ||
    options.length < 2 ||
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex >= options.length
  ) {
    return null;
  }

  return {
    question: quiz.question.trim().slice(0, 300),
    options,
    answerIndex,
    explanation: typeof quiz.explanation === "string" ? quiz.explanation.trim().slice(0, 300) : ""
  };
}
