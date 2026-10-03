import { buildSystemPrompt } from "./prompt.js";
import { validateClassification } from "./validation.js";

export async function classifyWithDeepSeek({ imageBuffer, mimeType, apiKey, baseUrl, model, rules }) {
  if (!apiKey) {
    const error = new Error("DEEPSEEK_API_KEY is not configured on the server.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const retryableCodes = new Set(["AI_EMPTY_RESPONSE", "AI_RATE_LIMITED", "AI_TIMEOUT", "AI_PROVIDER_ERROR", "AI_INVALID_JSON", "AI_INVALID_RESPONSE"]);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestDeepSeek({ imageBuffer, mimeType, apiKey, baseUrl, model, rules });
    } catch (error) {
      if (!retryableCodes.has(error.code) || attempt === 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

async function requestDeepSeek({ imageBuffer, mimeType, apiKey, baseUrl, model, rules }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        max_tokens: 1200,
        messages: [
          { role: "system", content: buildSystemPrompt(rules) },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this item using the supplied Macau guidance." },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`DeepSeek returned HTTP ${response.status}.`);
      error.code = response.status === 429 ? "AI_RATE_LIMITED" : "AI_PROVIDER_ERROR";
      error.detail = detail.slice(0, 500);
      throw error;
    }

    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    const content = Array.isArray(rawContent)
      ? rawContent.filter((part) => part && typeof part.text === "string").map((part) => part.text).join("\n")
      : rawContent;
    if (typeof content !== "string" || !content.trim()) {
      const error = new Error("DeepSeek returned an empty response.");
      error.code = "AI_EMPTY_RESPONSE";
      throw error;
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFence(content));
    } catch (error) {
      const jsonError = new Error("The AI response was not valid JSON.");
      jsonError.code = "AI_INVALID_JSON";
      jsonError.detail = error.message;
      throw jsonError;
    }

    try {
      return validateClassification(parsed, rules?.sources || []);
    } catch (error) {
      const responseError = new Error("The AI response did not match the required classification format.");
      responseError.code = "AI_INVALID_RESPONSE";
      responseError.detail = error.message;
      throw responseError;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("The AI request timed out.");
      timeoutError.code = "AI_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function stripJsonFence(content) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}
