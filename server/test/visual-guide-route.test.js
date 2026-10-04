import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createVisualGuideStore } from "../src/visual-guide-store.js";
import { createVisualGuideRouter } from "../src/visual-guide-route.js";

const classification = { itemName: "Bottle", category: "plastic", recyclable: true, confidence: 0.8 };

test("duplicate scan requests share one job, cache its response, and expire", async () => {
  let calls = 0;
  let finish;
  let time = 0;
  const store = createVisualGuideStore({ configured: true, now: () => time, ttlMs: 10, generate: async () => {
    calls += 1;
    return new Promise((resolve) => { finish = resolve; });
  } });
  const guide = store.register(classification);
  const first = store.get(guide.scanId);
  const second = store.get(guide.scanId);
  await Promise.resolve();
  finish({ status: "ready", title: "Anatomy" });
  assert.deepEqual(await first, await second);
  assert.equal((await store.get(guide.scanId)).status, "ready");
  assert.equal(calls, 1);
  time = 11;
  assert.equal((await store.get(guide.scanId)).status, "unavailable");
});

test("no scan references are issued for low confidence or missing image configuration", () => {
  const config = { generate: async () => ({ status: "ready" }) };
  assert.equal(createVisualGuideStore({ ...config, configured: false }).register(classification).scanId, undefined);
  assert.equal(createVisualGuideStore({ ...config, configured: true }).register({ ...classification, confidence: 0.2 }).status, "skipped");
});

test("generation errors leave a cached failure rather than repeating provider calls", async () => {
  let calls = 0;
  const store = createVisualGuideStore({ configured: true, generate: async () => { calls += 1; throw new Error("private provider detail"); } });
  const guide = store.register(classification);
  assert.equal((await store.get(guide.scanId)).status, "failed");
  assert.equal(JSON.stringify(await store.get(guide.scanId)).includes("private"), false);
  assert.equal(calls, 1);
});

test("caps active jobs and cache entries while keeping in-flight scans", async () => {
  let calls = 0;
  const finishes = [];
  const store = createVisualGuideStore({ configured: true, maxConcurrent: 2, maxEntries: 2, generate: () => {
    calls += 1;
    return new Promise((resolve) => finishes.push(resolve));
  } });
  const first = store.register(classification);
  const second = store.register(classification);
  const firstJob = store.get(first.scanId);
  const secondJob = store.get(second.scanId);
  await Promise.resolve();
  assert.equal(store.register(classification).status, "unavailable");
  assert.equal(calls, 2);
  finishes.forEach((finish) => finish({ status: "ready" }));
  await firstJob;
  await secondJob;
  const third = store.register(classification);
  assert.equal(third.status, "pending");
  assert.equal((await store.get(first.scanId)).status, "unavailable");
});

test("a waiting third scan does not start an image request at the concurrency limit", async () => {
  let calls = 0;
  const finishes = [];
  const store = createVisualGuideStore({ configured: true, generate: () => { calls += 1; return new Promise((resolve) => finishes.push(resolve)); } });
  const scans = [store.register(classification), store.register(classification), store.register(classification)];
  const first = store.get(scans[0].scanId);
  const second = store.get(scans[1].scanId);
  assert.equal((await store.get(scans[2].scanId)).status, "unavailable");
  assert.equal(calls, 2);
  finishes.forEach((finish) => finish({ status: "ready" }));
  await first;
  await second;
});

test("HTTP endpoint rejects arbitrary prompts and only generates a backend-registered scan", async (t) => {
  let calls = 0;
  const store = createVisualGuideStore({ configured: true, generate: async () => { calls += 1; return { status: "ready", title: "Bottle" }; } });
  const app = express();
  app.use("/api", createVisualGuideRouter(store));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/visual-guide`;
  const post = (body) => fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ prompt: "arbitrary prompt", classification })).status, 400);
  assert.equal((await post({ scanId: "forged" })).status, 400);
  assert.equal((await post({ scanId: "0184b91e-e7cf-4b4c-92bc-90573a178c0b", data: "x".repeat(3000) })).status, 413);
  assert.equal(calls, 0);
  const scan = store.register(classification);
  const response = await post({ scanId: scan.scanId });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).status, "ready");
  assert.equal((await (await post({ scanId: scan.scanId })).json()).status, "ready");
  assert.equal(calls, 1);
});
