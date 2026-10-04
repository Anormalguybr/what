import express from "express";

export function createVisualGuideRouter(store) {
  const router = express.Router();
  router.post("/visual-guide", express.json({ limit: "2kb" }), async (request, response) => {
    const scanId = request.body?.scanId;
    if (typeof scanId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scanId)) {
      return response.status(400).json({ status: "failed", message: "A valid scan reference is required." });
    }
    response.set("Cache-Control", "no-store");
    return response.json(await store.get(scanId));
  });
  router.use((error, _request, response, _next) => {
    return response.status(error.type === "entity.too.large" ? 413 : 400).json({ status: "failed", message: "The visual guide request could not be processed." });
  });
  return router;
}
