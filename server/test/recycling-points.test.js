import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { loadRecyclingPoints, createRecyclingPointsApi } from "../src/recycling-points.js";
import { createRecyclingPointsRouter } from "../src/recycling-points-route.js";

const fixture = {
  accessed: "2026-10-06",
  sourceNote: "Fixture",
  sources: [
    { id: "src-a", name: "Source A", url: "https://example.org/a", accessed: "2026-10-06", use: "test" }
  ],
  channels: [
    {
      id: "glass",
      name: "Glass bottles",
      nameZh: "玻璃樽",
      accepts: ["glass"],
      note: "Rinse first.",
      officialFinder: "https://example.org/a",
      sourceIds: ["src-a"],
      locations: [
        { id: "g1", name: "G1 Park", address: "Park Road 1", region: "macau", latitude: 22.2, longitude: 113.54, sourceIds: ["src-a"] },
        { id: "g2", name: "G2 Square", address: "Square Road 2", region: "macau", sourceIds: ["src-a"] },
        { id: "g3", name: "G3 Beach", address: "Beach Road 3", region: "coloane", latitude: 22.1, longitude: 113.6, sourceIds: ["src-a"] }
      ]
    },
    {
      id: "batteries",
      name: "Batteries",
      nameZh: "投電池",
      accepts: ["battery"],
      note: "Never bin batteries.",
      officialFinder: "https://example.org/a",
      sourceIds: ["src-a"],
      locations: [
        { id: "b1", name: "B1 Shop", address: "Shop Road 4", region: "taipa", latitude: 22.21, longitude: 113.55, sourceIds: ["src-a"] }
      ]
    }
  ]
};

test("channel summaries report counts, region totals and sources", () => {
  const api = createRecyclingPointsApi(fixture);
  const summary = api.listChannels();
  assert.equal(summary.total, 4);
  assert.equal(summary.accessed, "2026-10-06");
  const glass = summary.channels.find((channel) => channel.id === "glass");
  assert.equal(glass.count, 3);
  assert.deepEqual(glass.regions, { macau: 2, taipa: 0, coloane: 1 });
  assert.equal(glass.locations, undefined);
  assert.equal(summary.sources[0].url, "https://example.org/a");
});

test("channel detail filters by region and free text, and paginates", () => {
  const api = createRecyclingPointsApi(fixture);
  assert.equal(api.getChannel("nope"), null);

  const byRegion = api.getChannel("glass", { region: "macau" });
  assert.equal(byRegion.total, 2);
  assert.deepEqual(byRegion.locations.map((location) => location.id), ["g1", "g2"]);

  const byQuery = api.getChannel("glass", { query: "beach" });
  assert.equal(byQuery.total, 1);
  assert.equal(byQuery.locations[0].id, "g3");

  const paged = api.getChannel("glass", { limit: 2, offset: 1 });
  assert.equal(paged.total, 3);
  assert.deepEqual(paged.locations.map((location) => location.id), ["g2", "g3"]);
  assert.equal(api.getChannel("glass", { limit: 9999 }).limit, 500);
  assert.equal(api.getChannel("glass").channel.located, 2);
});

test("nearby ranks coordinate points by distance and ignores address-only points", () => {
  const api = createRecyclingPointsApi(fixture);
  assert.equal(api.locatedTotal, 3);
  const result = api.nearby(22.2, 113.54, { limit: 2 });
  assert.equal(result.total, 3);
  assert.deepEqual(result.locations.map((location) => location.id), ["g1", "b1"]);
  assert.equal(result.locations[0].distanceMeters, 0);
  assert.equal(result.locations[0].channelId, "glass");
  assert.equal(result.locations[1].channelName, "Batteries");
  assert.ok(result.locations[1].distanceMeters > 0);
  assert.equal(result.locations.some((location) => location.id === "g2"), false);

  // A category keeps only points whose channel accepts that stream.
  const glassOnly = api.nearby(22.2, 113.54, { category: "glass", limit: 5 });
  assert.equal(glassOnly.stream, "glass");
  assert.equal(glassOnly.locations.every((location) => location.channelId === "glass"), true);
  assert.deepEqual(glassOnly.locations.map((location) => location.id), ["g1", "g3"]);
  const battery = api.nearby(22.2, 113.54, { category: "electronic" });
  assert.equal(battery.stream, "electronic");
  assert.equal(battery.total, 0);
  assert.deepEqual(battery.locations, []);
  const waste = api.nearby(22.2, 113.54, { category: "general_waste" });
  assert.equal(waste.stream, null);
  assert.equal(waste.total, 0);
});

test("the shipped dataset is present, source-linked and region-tagged", () => {
  const api = loadRecyclingPoints();
  const summary = api.listChannels();
  const ids = summary.channels.map((channel) => channel.id);
  for (const expected of ["eco-fun-stations", "clothes", "glass", "lamps", "electronics-fixed", "batteries"]) {
    assert.ok(ids.includes(expected), `missing channel ${expected}`);
  }
  assert.ok(summary.total > 500, "expected a substantial captured point list");
  const sourceIds = new Set(summary.sources.map((source) => source.id));
  for (const channel of summary.channels) {
    for (const sourceId of channel.sourceIds) assert.ok(sourceIds.has(sourceId), `${channel.id} references unknown source ${sourceId}`);
    assert.equal(channel.count > 0, true);
  }
  for (const region of Object.keys(summary.channels[0].regions)) assert.ok(["macau", "taipa", "coloane"].includes(region));

  // The Eco Fun network is the only channel set with official coordinates.
  assert.ok(summary.locatedTotal >= 40, "expected official coordinates for the Eco Fun network");
  const stations = api.getChannel("eco-fun-stations", { region: "macau" });
  assert.ok(stations.locations.every((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude)));
  assert.equal(api.nearby(22.2, 113.55, { limit: 3 }).locations[0].distanceMeters <= api.nearby(22.2, 113.55, { limit: 3 }).locations[1].distanceMeters, true);
  assert.equal(api.nearby(22.2, 113.55, { limit: 3 }).locations.every((location) => location.channelId && Number.isFinite(location.distanceMeters)), true);

  // Real data: the Eco Fun stations accept electronics, so a scan of an
  // electronic item must still be offered a nearby, accepting point.
  const electronic = api.nearby(22.2, 113.55, { category: "electronic", limit: 5 });
  assert.ok(electronic.total > 0, "expected at least one located point that accepts electronics");
  assert.equal(electronic.locations.every((location) => location.accepts.includes("electronic")), true);
  const glass = api.nearby(22.2, 113.55, { category: "glass", limit: 5 });
  assert.equal(glass.locations.every((location) => location.accepts.includes("glass")), true);
});

test("HTTP routes expose summaries, filter channels and reject bad input", async (t) => {
  const api = createRecyclingPointsApi(fixture);
  const app = express();
  app.use("/api", createRecyclingPointsRouter(api));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/recycling-points`;

  const list = await fetch(base);
  assert.equal(list.headers.get("cache-control"), "no-store");
  assert.equal((await list.json()).total, 4);

  const filtered = await fetch(`${base}/glass?region=macau&q=park`);
  assert.equal(filtered.status, 200);
  const payload = await filtered.json();
  assert.equal(payload.total, 1);
  assert.equal(payload.locations[0].id, "g1");
  assert.equal(payload.sources[0].name, "Source A");

  assert.equal((await fetch(`${base}/glass?region=mars`)).status, 400);
  assert.equal((await fetch(`${base}/unknown`)).status, 404);

  // "nearby" must win over the ":channelId" route
  const nearby = await fetch(`${base}/nearby?lat=22.2&lng=113.54&limit=2`);
  assert.equal(nearby.status, 200);
  assert.deepEqual((await nearby.json()).locations.map((location) => location.id), ["g1", "b1"]);
  assert.equal((await fetch(`${base}/nearby?lat=999&lng=0`)).status, 400);
  assert.equal((await fetch(`${base}/nearby`)).status, 400);

  const categoryNearby = await fetch(`${base}/nearby?lat=22.2&lng=113.54&category=glass&limit=5`);
  const categoryPayload = await categoryNearby.json();
  assert.equal(categoryPayload.stream, "glass");
  assert.deepEqual(categoryPayload.locations.map((location) => location.id), ["g1", "g3"]);
  assert.equal((await fetch(`${base}/nearby?lat=22.2&lng=113.54&category=banana`)).status, 400);
});
