import express from "express";
import { RECYCLING_REGIONS, SCAN_CATEGORIES } from "./recycling-points.js";

const REGION_SET = new Set(RECYCLING_REGIONS);
const CATEGORY_SET = new Set(SCAN_CATEGORIES);

export function createRecyclingPointsRouter(api) {
  const router = express.Router();

  router.get("/recycling-points", (_request, response) => {
    response.set("Cache-Control", "no-store");
    return response.json(api.listChannels());
  });

  // Must be declared before "/recycling-points/:channelId" so "nearby" is not
  // treated as a channel id.
  router.get("/recycling-points/nearby", (request, response) => {
    const latitude = Number.parseFloat(request.query.lat);
    const longitude = Number.parseFloat(request.query.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return response.status(400).json({ error: "INVALID_COORDINATES", message: "A valid latitude and longitude are required." });
    }
    const category = typeof request.query.category === "string" ? request.query.category : "";
    if (category && !CATEGORY_SET.has(category)) {
      return response.status(400).json({ error: "INVALID_CATEGORY", message: "Unknown item category." });
    }
    response.set("Cache-Control", "no-store");
    return response.json(api.nearby(latitude, longitude, { limit: request.query.limit, category }));
  });

  router.get("/recycling-points/:channelId", (request, response) => {
    const region = typeof request.query.region === "string" ? request.query.region : "";
    if (region && !REGION_SET.has(region)) {
      return response.status(400).json({ error: "INVALID_REGION", message: "Region must be macau, taipa or coloane." });
    }

    const result = api.getChannel(request.params.channelId, {
      region,
      query: typeof request.query.q === "string" ? request.query.q.slice(0, 80) : "",
      limit: request.query.limit,
      offset: request.query.offset
    });

    if (!result) {
      return response.status(404).json({ error: "UNKNOWN_CHANNEL", message: "That recycling channel is not available." });
    }

    response.set("Cache-Control", "no-store");
    return response.json(result);
  });

  return router;
}
