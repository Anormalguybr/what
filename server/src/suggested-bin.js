/**
 * Map a validated classification category to the official Macau collection
 * container, using the curated `bins` section of the rules file.
 *
 * The AI decides the category; this lookup decides which Macau bin is suggested.
 * That keeps the bin recommendation sourced and deterministic instead of letting
 * the model invent a container or a colour.
 */
export function findSuggestedBin(rules, category) {
  const bins = Array.isArray(rules?.bins) ? rules.bins : [];
  const bin = bins.find((entry) => entry && entry.category === category);
  if (!bin) return null;

  const sources = (bin.sourceIds || [])
    .map((id) => (rules.sources || []).find((source) => source.id === id))
    .filter(Boolean)
    .map((source) => ({ name: source.name, url: source.url }));

  return {
    category: bin.category,
    name: bin.name,
    nameZh: bin.nameZh || "",
    guidance: bin.guidance || "",
    // Official Macau bin photo served by this server; the client prefixes its API URL.
    image: bin.image && bin.image.file ? `/api/bin-images/${bin.image.file}` : null,
    imageAlt: `${bin.name} in Macau`,
    imageCredit: bin.image ? { text: bin.image.credit, url: bin.image.sourceUrl, accessed: bin.image.accessed } : null,
    sources
  };
}
