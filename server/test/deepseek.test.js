import test from "node:test";
import assert from "node:assert/strict";
import { classifyWithDeepSeek } from "../src/deepseek.js";

test("reports an explicit error when the server key is missing", async () => {
  await assert.rejects(
    () => classifyWithDeepSeek({
      imageBuffer: Buffer.from("test"),
      mimeType: "image/png",
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-flash",
      rules: {}
    }),
    (error) => error.code === "AI_NOT_CONFIGURED"
  );
});

