import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { findSuggestedBin } from "../src/suggested-bin.js";

const rules = JSON.parse(readFileSync(new URL("../data/macau-recycling-rules.json", import.meta.url), "utf8"));

test("maps each recyclable category to a sourced Macau bin", () => {
  for (const category of ["plastic", "metal", "paper", "glass", "electronic", "organic", "general_waste"]) {
    const bin = findSuggestedBin(rules, category);
    assert.ok(bin, `expected a suggested bin for ${category}`);
    assert.ok(bin.name, `${category} bin needs a name`);
    assert.ok(bin.guidance, `${category} bin needs guidance`);
    assert.ok(bin.sources.length > 0, `${category} bin needs a source`);
    assert.equal(bin.sources.every((source) => typeof source.url === "string" && source.url.startsWith("https://")), true);
  }
  assert.equal(findSuggestedBin(rules, "unknown"), null);
  assert.equal(findSuggestedBin(rules, "not-a-category"), null);
});

test("the three-colour bins name the streams Macau publishes", () => {
  assert.match(findSuggestedBin(rules, "plastic").name, /plastic bottles/i);
  assert.match(findSuggestedBin(rules, "metal").name, /cans/i);
  assert.match(findSuggestedBin(rules, "paper").name, /paper/i);
});

test("bin photos reference real, attributed Macau image files", () => {
  for (const category of ["plastic", "metal", "paper", "glass", "electronic"]) {
    const bin = findSuggestedBin(rules, category);
    assert.ok(bin.image, `${category} bin should expose an image path`);
    assert.match(bin.image, /^\/api\/bin-images\/[A-Za-z0-9._-]+$/);
    const fileName = bin.image.split("/").pop();
    const fileUrl = new URL("../data/bin-images/" + fileName, import.meta.url);
    assert.equal(existsSync(fileUrl), true, `${category} bin image file is missing`);
    assert.ok(bin.imageCredit && bin.imageCredit.text && bin.imageCredit.url, `${category} bin image needs DSPA attribution`);
    assert.equal(bin.imageAlt.length > 0, true);
  }
  // Streams with no official Macau bin photo stay text-only.
  assert.equal(findSuggestedBin(rules, "organic").image, null);
  assert.equal(findSuggestedBin(rules, "general_waste").image, null);
});
