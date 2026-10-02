import test from "node:test";
import assert from "node:assert/strict";
import { isSupportedImageBuffer } from "../src/image-validation.js";

test("accepts matching JPEG, PNG, and WebP signatures", () => {
  assert.equal(isSupportedImageBuffer(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(isSupportedImageBuffer(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(isSupportedImageBuffer(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
});

test("rejects a MIME type with mismatched content", () => {
  assert.equal(isSupportedImageBuffer(Buffer.from("not an image"), "image/png"), false);
});
