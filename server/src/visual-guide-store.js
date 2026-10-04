import { randomUUID } from "node:crypto";
import { decideVisualGuide } from "./visual-guide.js";

// Store classification metadata and generated results in memory, never student photos.
export function createVisualGuideStore({ generate, configured, ttlMs = 10 * 60_000, maxEntries = 16, maxConcurrent = 2, now = Date.now }) {
  const entries = new Map();
  let active = 0;
  function prune() {
    for (const [id, entry] of entries) {
      if (!entry.pending && now() - entry.createdAt >= ttlMs) entries.delete(id);
    }
  }
  return {
    register(result) {
      const decision = decideVisualGuide(result);
      if (!decision.shouldGenerate) return { ...decision, status: "skipped", message: decision.reason };
      if (!configured) return { ...decision, status: "unavailable", message: "The educational image service is not configured yet." };
      prune();
      if (entries.size >= maxEntries) {
        const oldest = [...entries].find(([, entry]) => !entry.pending);
        if (oldest) entries.delete(oldest[0]);
        else return { ...decision, status: "unavailable", message: "The educational image service is busy. Try another scan later." };
      }
      const scanId = randomUUID();
      entries.set(scanId, { result, createdAt: now(), pending: null, response: null });
      return { ...decision, scanId, status: "pending" };
    },
    async get(scanId) {
      prune();
      const entry = entries.get(scanId);
      if (!entry) return { status: "unavailable", message: "This scan has expired. Scan the item again for a visual guide." };
      if (entry.response) return entry.response;
      if (entry.pending) return entry.pending;
      if (active >= maxConcurrent) return { status: "unavailable", message: "The educational image service is busy. Classification is still available." };
      active += 1;
      entry.pending = Promise.resolve().then(() => generate(entry.result)).catch(() => ({
        status: "failed", message: "The educational image could not be generated. Your sorting result is still available."
      })).then((response) => {
        entry.response = response;
        return response;
      }).finally(() => {
        active -= 1;
        entry.pending = null;
      });
      return entry.pending;
    }
  };
}
