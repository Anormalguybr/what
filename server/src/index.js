import "dotenv/config";
import { readFileSync } from "node:fs";
import cors from "cors";
import express from "express";
import multer from "multer";
import { classifyWithDeepSeek } from "./deepseek.js";
import { isSupportedImageBuffer } from "./image-validation.js";

const rulesData = JSON.parse(readFileSync(new URL("../data/macau-recycling-rules.json", import.meta.url), "utf8"));

const app = express();
const port = Number(process.env.PORT || 8787);
const maxImageBytes = Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageBytes, files: 1 },
  fileFilter: (_request, _file, callback) => callback(null, true)
});

app.use(cors({ origin: clientOrigin }));
app.get("/api/health", (_request, response) => {
  response.json({ ok: true, aiConfigured: Boolean(process.env.DEEPSEEK_API_KEY) });
});

app.post("/api/classify", upload.single("image"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({
      error: "IMAGE_REQUIRED",
      message: "Please choose a JPEG, PNG, or WebP image."
    });
  }

  if (!allowedMimeTypes.has(request.file.mimetype)) {
    return response.status(415).json({
      error: "UNSUPPORTED_IMAGE_TYPE",
      message: "Only JPEG, PNG, and WebP images are supported."
    });
  }

  if (!isSupportedImageBuffer(request.file.buffer, request.file.mimetype)) {
    return response.status(415).json({
      error: "INVALID_IMAGE_CONTENT",
      message: "The file content does not match a supported image format."
    });
  }

  try {
    const result = await classifyWithDeepSeek({
      imageBuffer: request.file.buffer,
      mimeType: request.file.mimetype,
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
      rules: rulesData
    });
    return response.json(result);
  } catch (error) {
    const statusByCode = {
      AI_NOT_CONFIGURED: 503,
      AI_RATE_LIMITED: 429,
      AI_TIMEOUT: 504,
      AI_PROVIDER_ERROR: 502,
      AI_NETWORK_ERROR: 502,
      AI_TRUNCATED_RESPONSE: 502,
      AI_EMPTY_RESPONSE: 502,
      AI_INVALID_JSON: 502,
      AI_INVALID_RESPONSE: 502
    };
    const status = statusByCode[error.code] || 502;
    // Never log the provider body, key, prompt, or uploaded image.
    console.warn("AI classification failed", { code: error.code || "AI_REQUEST_FAILED", providerStatus: error.providerStatus });
    return response.status(status).json({
      error: error.code || "AI_REQUEST_FAILED",
      message: publicErrorMessage(error.code),
      retryable: error.retryable !== false && ["AI_RATE_LIMITED", "AI_TIMEOUT", "AI_PROVIDER_ERROR", "AI_NETWORK_ERROR", "AI_EMPTY_RESPONSE", "AI_INVALID_JSON", "AI_INVALID_RESPONSE", "AI_TRUNCATED_RESPONSE"].includes(error.code)
    });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({
      error: "IMAGE_TOO_LARGE",
      message: `Image must be smaller than ${Math.round(maxImageBytes / 1024 / 1024)} MB.`
    });
  }
  return response.status(400).json({
    error: "INVALID_REQUEST",
    message: "The image request could not be processed."
  });
});

app.listen(port, () => {
  console.log(`EcoScan API listening on http://localhost:${port}`);
});

function publicErrorMessage(code) {
  const messages = {
    AI_NOT_CONFIGURED: "The AI service is not configured on this server yet.",
    AI_RATE_LIMITED: "The AI service is busy. Please try again shortly.",
    AI_TIMEOUT: "The AI service took too long to respond. Please try again.",
    AI_PROVIDER_ERROR: "The AI service returned an error. Please try again later.",
    AI_NETWORK_ERROR: "The server could not reach the AI service. Please try again.",
    AI_TRUNCATED_RESPONSE: "The AI result was incomplete. Please try again.",
    AI_EMPTY_RESPONSE: "The AI service returned no usable result.",
    AI_INVALID_JSON: "The AI service returned an invalid result. Please try again.",
    AI_INVALID_RESPONSE: "The AI service returned an incomplete result. Please try again."
  };
  return messages[code] || "The image could not be classified right now.";
}

export { app };
