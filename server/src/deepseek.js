import { buildSystemPrompt } from "./prompt.js";
import { validateClassification } from "./validation.js";

export async function classifyWithDeepSeek({ imageBuffer, mimeType, apiKey, baseUrl, model, rules }) {
  if (!apiKey) {
    const error = new Error("DEEPSEEK_API_KEY is not configured on the server.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestDeepSeek({ imageBuffer, mimeType, apiKey, baseUrl, model, rules });
    } catch (error) {
      if (error.code !== "AI_EMPTY_RESPONSE" || attempt === 1) {
        throw error;
      }
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
        max_tokens: 900,
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
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      const error = new Error("DeepSeek returned an empty response.");
      error.code = "AI_EMPTY_RESPONSE";
      throw error;
    }

    return validateClassification(JSON.parse(content), rules?.sources || []);
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("The AI request timed out.");
      timeoutError.code = "AI_TIMEOUT";
      throw timeoutError;
    }
    if (error instanceof SyntaxError) {
      const jsonError = new Error("The AI response was not valid JSON.");
      jsonError.code = "AI_INVALID_JSON";
      throw jsonError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
