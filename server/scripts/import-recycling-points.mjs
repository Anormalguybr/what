/**
 * Import Macau recycling drop-off points from the official DSPA website.
 *
 * This script is a maintenance tool, not part of the running API. It downloads
 * a few public DSPA pages, extracts the published drop-off points, and writes
 * `server/data/macau-recycling-points.json`. The generated file is committed so
 * the API does not depend on the DSPA website at request time.
 *
 * Run it again when the DSPA updates a page:
 *   npm --prefix server run import:points
 *
 * Every point keeps the page it came from, so the app can always show a source
 * link and the date the list was captured. Do not edit the JSON by hand.
 */
import { writeFileSync } from "node:fs";

const BASE = "https://www.dspa.gov.mo/";
const ACCESSED = new Date().toISOString().slice(0, 10);

const SOURCES = {
  "dspa-ecofun": {
    name: "DSPA - Eco Fun recycling and application points",
    url: `${BASE}ecofunweb/1station.aspx?lang=tc`,
    use: "Eco Fun stations, mobile recycling truck schedule, street stations and service points"
  },
  "dspa-clothes": {
    name: "DSPA - Clothing recycling locations",
    url: `${BASE}richtext_RecyclingClothes.aspx?a_id=1629876030`,
    use: "Clothing collection bins and Eco Fun stations that accept clothing"
  },
  "dspa-glass": {
    name: "DSPA - Glass bottle public collection points",
    url: `${BASE}richtext_recycle_glass_bottle.aspx?a_id=1569493659`,
    use: "Public glass bottle collection points"
  },
  "dspa-lamp": {
    name: "DSPA - Light tube and bulb collection points",
    url: `${BASE}richtext_lamp_recycling.aspx?a_id=1710390601`,
    use: "Collection points for fluorescent tubes, bulbs and other lamps"
  },
  "dspa-eee-fixed": {
    name: "DSPA - Electronic and electrical equipment fixed collection network",
    url: `${BASE}richtext3.aspx?a_id=1506052934`,
    use: "Fixed collection points for computers, communication equipment and home appliances"
  },
  "dspa-eee-mobile": {
    name: "DSPA - Electronic and electrical equipment mobile collection network",
    url: `${BASE}richtext3.aspx?a_id=1506052998`,
    use: "Mobile collection points for computers, communication equipment and small appliances"
  },
  "dspa-battery-points": {
    name: "DSPA - Waste battery collection points",
    url: `${BASE}richtext2.aspx?a_id=101412`,
    use: "Public waste battery collection points across Macau"
  },
  "dspa-ecofun-coords": {
    name: "DSPA - Eco Fun network co-ordinates",
    url: `${BASE}ecofunweb/read_time.aspx?station=ALL`,
    use: "Official latitude and longitude for the Eco Fun stations, mobile truck, street stations, service points and community points"
  }
};

// Metadata for each channel. `accepts` uses short stream keys that the client
// maps to icons and to the scanner's item categories.
const CHANNELS = [
  {
    id: "eco-fun-stations",
    name: "Eco Fun stations",
    nameZh: "環保加Fun站",
    accepts: ["paper", "plastic", "metal", "glass", "electronic"],
    note: "Staffed DSPA drop-off stations that accept several recycling streams and issue Eco Fun points cards. Opening hours differ between stations.",
    officialFinder: SOURCES["dspa-ecofun"].url,
    sourceIds: ["dspa-ecofun", "dspa-ecofun-coords"]
  },
  {
    id: "eco-fun-mobile-truck",
    name: "Mobile recycling truck",
    nameZh: "流動回收車",
    accepts: ["paper", "plastic", "metal", "glass", "electronic"],
    note: "Each stop is usually served once a month. Times and dates are published by DSPA and can change, so confirm before travelling.",
    officialFinder: SOURCES["dspa-ecofun"].url,
    sourceIds: ["dspa-ecofun", "dspa-ecofun-coords"]
  },
  {
    id: "eco-fun-street-stations",
    name: "Eco Fun street stations",
    nameZh: "環保Fun乾淨回收街站",
    accepts: ["paper", "plastic", "metal", "glass"],
    note: "Weekly street collection stations operated by DSPA.",
    officialFinder: SOURCES["dspa-ecofun"].url,
    sourceIds: ["dspa-ecofun", "dspa-ecofun-coords"]
  },
  {
    id: "eco-fun-service-points",
    name: "Eco Fun service points",
    nameZh: "環保Fun服務站點",
    accepts: ["paper", "plastic", "metal", "glass"],
    note: "Community association counters that accept recyclables and Eco Fun card services.",
    officialFinder: SOURCES["dspa-ecofun"].url,
    sourceIds: ["dspa-ecofun", "dspa-ecofun-coords"]
  },
  {
    id: "eco-fun-community-points",
    name: "Community recycling points",
    nameZh: "減廢回收攞滿Fun",
    accepts: ["paper", "plastic", "metal", "glass"],
    note: "Neighbourhood association points that run scheduled recycling collections. Check the listed day and time.",
    officialFinder: SOURCES["dspa-ecofun"].url,
    sourceIds: ["dspa-ecofun", "dspa-ecofun-coords"]
  },
  {
    id: "clothes",
    name: "Clothing",
    nameZh: "舊衣回收",
    accepts: ["clothes"],
    note: "Clothing collection bins plus Eco Fun stations that accept used clothes. Only clean, dry, wearable items should be donated.",
    officialFinder: SOURCES["dspa-clothes"].url,
    sourceIds: ["dspa-clothes"]
  },
  {
    id: "glass",
    name: "Glass bottles",
    nameZh: "玻璃樽回收",
    accepts: ["glass"],
    note: "Public glass bottle collection points. Rinse bottles and remove caps and labels where possible.",
    officialFinder: SOURCES["dspa-glass"].url,
    sourceIds: ["dspa-glass"]
  },
  {
    id: "lamps",
    name: "Light tubes and bulbs",
    nameZh: "投光管投燈泡",
    accepts: ["lamp"],
    note: "Collection points marked with the recycling logo. Wrap tubes in their packaging before dropping them in to avoid breakage.",
    officialFinder: SOURCES["dspa-lamp"].url,
    sourceIds: ["dspa-lamp"]
  },
  {
    id: "electronics-fixed",
    name: "Electronics - fixed points",
    nameZh: "電子及電器設備固定回收點",
    accepts: ["electronic"],
    note: "Fixed collection points for computers, communication equipment and home appliances.",
    officialFinder: SOURCES["dspa-eee-fixed"].url,
    sourceIds: ["dspa-eee-fixed"]
  },
  {
    id: "electronics-mobile",
    name: "Electronics - mobile points",
    nameZh: "電子及電器設備流動回收點",
    accepts: ["electronic"],
    note: "Mobile collection points for computers, communication equipment and small appliances. Days and times can change.",
    officialFinder: SOURCES["dspa-eee-mobile"].url,
    sourceIds: ["dspa-eee-mobile"]
  },
  {
    id: "batteries",
    name: "Batteries",
    nameZh: "投電池",
    accepts: ["battery"],
    note: "Public waste battery collection points. Batteries must never be placed in the ordinary paper, plastic, metal or glass bins.",
    officialFinder: SOURCES["dspa-battery-points"].url,
    sourceIds: ["dspa-battery-points"]
  }
];

async function fetchText(path) {
  const response = await fetch(new URL(path, BASE));
  if (!response.ok) throw new Error(`DSPA request failed (${response.status}) for ${path}`);
  return response.text();
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferRegion(text, anchorRegion, hasAnchors) {
  const value = text.trim();
  if (/^T\s?\d/i.test(value) || value.includes("氹仔")) return "taipa";
  if (/^C\s?\d/i.test(value) || value.includes("路環")) return "coloane";
  if (hasAnchors) return anchorRegion;
  return "macau";
}

function regionMarkers(html) {
  const markers = [];
  const pattern = /name="(macau|taipa|coloane)"|id="(macau|taipa|coloane)_tc"/gi;
  let match;
  while ((match = pattern.exec(html))) markers.push({ at: match.index, region: (match[1] || match[2]).toLowerCase() });
  return markers.sort((a, b) => a.at - b.at);
}

/**
 * Parse the shared DSPA card layout: every point is a `<div class="box">`
 * containing a `.address_title` and one or more `.address` lines.
 */
function parseBoxes(html) {
  const positions = [];
  const boxPattern = /<div class="box"/g;
  let match;
  while ((match = boxPattern.exec(html))) positions.push(match.index);

  const markers = regionMarkers(html);
  const hasAnchors = markers.length > 0;

  const points = [];
  positions.forEach((start, index) => {
    const end = index + 1 < positions.length ? positions[index + 1] : html.length;
    const chunk = html.slice(start, end);
    const titleMatch = chunk.match(/class="address_title"[^>]*>([\s\S]*?)<\/(?:a|div|span|td)>/i);
    if (!titleMatch) return;
    const addressMatches = [...chunk.matchAll(/class="address"[^>]*>([\s\S]*?)<\/(?:div|span|td|p)>/gi)].map((m) => stripTags(m[1]));
    const hrefMatch = chunk.match(/href="([^"]+\?[^"]*)"/i);

    let region = "macau";
    for (const marker of markers) {
      if (marker.at <= start) region = marker.region;
      else break;
    }

    const name = stripTags(titleMatch[1]);
    const address = (addressMatches[0] || "").replace(/^地址：/, "").trim();
    const detail = addressMatches.slice(1).join(" ").trim();
    points.push({
      name,
      address: address || name,
      ...(detail ? { detail } : {}),
      region: inferRegion(`${name} ${address}`, region, hasAnchors),
      ...(hrefMatch ? { link: new URL(hrefMatch[1], BASE).href } : {})
    });
  });

  return points;
}

/**
 * Parse the Eco Fun table page. Each section is a `<table class="station_table">`
 * introduced by a paragraph that names the section.
 */
function classifyEcoFunSection(heading) {
  if (heading.includes("環保加Fun站")) return "eco-fun-stations";
  if (heading.includes("流動回收車")) return "eco-fun-mobile-truck";
  if (heading.includes("乾淨回收街站")) return "eco-fun-street-stations";
  if (heading.includes("僅向該大廈居民開放")) return "eco-fun-resident-only";
  if (heading.includes("減廢回收攞滿Fun")) return "eco-fun-community-points";
  if (heading.includes("服務站點")) return "eco-fun-service-points";
  return null;
}

function parseEcoFun(html) {
  // Section titles use the `inbull_leaf` paragraph immediately before each table.
  const headings = [];
  const headingPattern = /class="inbull_leaf"[^>]*>([\s\S]*?)<\/p>/gi;
  let headingMatch;
  while ((headingMatch = headingPattern.exec(html))) headings.push({ at: headingMatch.index, text: stripTags(headingMatch[1]) });

  // The resident-only section heading is not an `inbull_leaf` paragraph, so track
  // its own marker and let the later marker win over an earlier general heading.
  const residentMarkers = [];
  const residentPattern = /僅向該大廈居民開放之站點/g;
  let residentMatch;
  while ((residentMatch = residentPattern.exec(html))) residentMarkers.push(residentMatch.index);

  const tablePattern = /<table[^>]*class="station_table"[^>]*>([\s\S]*?)<\/table>/gi;
  const sections = {};
  let match;
  while ((match = tablePattern.exec(html))) {
    const heading = [...headings].reverse().find((entry) => entry.at < match.index);
    const residentAt = [...residentMarkers].reverse().find((at) => at < match.index) ?? -1;
    const isResidentOnly = residentAt !== -1 && (!heading || residentAt > heading.at);
    const key = isResidentOnly ? "eco-fun-resident-only" : classifyEcoFunSection(heading ? heading.text : "");
    // The DSPA markup sometimes omits a closing </tr> after header rows, so split
    // on opening <tr> tags instead of matching complete rows.
    const rows = match[1].split(/<tr\b[^>]*>/i).slice(1).map((chunk) => chunk.split(/<\/tr>/i)[0]);
    const points = rows
      .filter((row) => !/^\s*<th/i.test(row))
      .map((row) => parseEcoFunRow(row))
      .filter((point) => point && !point.name.startsWith("*") && !point.name.includes("颱風及暴雨時的運作安排"));
    if (!key || !points.length) continue;
    sections[key] = [...(sections[key] || []), ...points];
  }
  return sections;
}

function parseEcoFunRow(row) {
  const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
  if (cells.length < 2) return null;
  const name = stripTags(cells[0]);
  if (!name) return null;

  const codeMatch = row.match(/station_calendar\.aspx\?station=([A-Za-z0-9]+)/i);
  const body = cells[1];
  const hoursMatch = body.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
  const hours = hoursMatch ? stripTags(hoursMatch[1]) : "";
  const address = stripTags(body.split(/<br\s*\/?>/i)[0]).replace(/^地址[:：]/, "").trim();
  const phone = cells[2] ? stripTags(cells[2]) : "";

  return {
    name,
    address: address || name,
    region: inferRegion(`${name} ${address}`, "macau", false),
    ...(codeMatch ? { stationCode: codeMatch[1] } : {}),
    ...(hours ? { hours } : {}),
    ...(/^[\d\s/]+$/.test(phone) && phone.replace(/\D/g, "").length >= 6 ? { phone } : {})
  };
}

const locationsByChannel = {
  "eco-fun-stations": [],
  "eco-fun-mobile-truck": [],
  "eco-fun-street-stations": [],
  "eco-fun-service-points": [],
  "eco-fun-community-points": [],
  clothes: [],
  glass: [],
  lamps: [],
  "electronics-fixed": [],
  "electronics-mobile": [],
  batteries: []
};

const ECOFUN_CHANNELS = ["eco-fun-stations", "eco-fun-mobile-truck", "eco-fun-street-stations", "eco-fun-service-points", "eco-fun-community-points"];

console.log("Importing recycling points from the DSPA website...");

const [ecofunHtml, clothesHtml, glassHtml, lampHtml, eeeFixedHtml, eeeMobileHtml, batteryHtml, readTimeRaw] = await Promise.all([
  fetchText("ecofunweb/1station.aspx?lang=tc"),
  fetchText("richtext_RecyclingClothes.aspx?a_id=1629876030"),
  fetchText("richtext_recycle_glass_bottle.aspx?a_id=1569493659"),
  fetchText("richtext_lamp_recycling.aspx?a_id=1710390601"),
  fetchText("richtext3.aspx?a_id=1506052934"),
  fetchText("richtext3.aspx?a_id=1506052998"),
  fetchText("richtext2.aspx?a_id=101412"),
  fetchText("ecofunweb/read_time.aspx?station=ALL")
]);

const ecoFunSections = parseEcoFun(ecofunHtml);
for (const id of ECOFUN_CHANNELS) {
  locationsByChannel[id] = ecoFunSections[id] || [];
}

// The Eco Fun network publishes official coordinates through its public
// `read_time.aspx?station=ALL` endpoint. Other channels publish addresses only.
const coordinateByCode = new Map(
  JSON.parse(readTimeRaw).json
    .filter((station) => station.StationCode && Number.isFinite(Number(station.LATITUDE)) && Number.isFinite(Number(station.LONGITUDE)))
    .map((station) => [String(station.StationCode).trim(), { latitude: Number(station.LATITUDE), longitude: Number(station.LONGITUDE) }])
);
for (const id of ECOFUN_CHANNELS) {
  locationsByChannel[id] = locationsByChannel[id].map((point) => {
    const coordinate = point.stationCode ? coordinateByCode.get(String(point.stationCode).trim()) : null;
    return coordinate ? { ...point, latitude: coordinate.latitude, longitude: coordinate.longitude } : point;
  });
}

locationsByChannel.clothes = parseBoxes(clothesHtml);
locationsByChannel.glass = parseBoxes(glassHtml);
locationsByChannel.lamps = parseBoxes(lampHtml);
locationsByChannel["electronics-fixed"] = parseBoxes(eeeFixedHtml);
locationsByChannel["electronics-mobile"] = parseBoxes(eeeMobileHtml);
locationsByChannel.batteries = parseBoxes(batteryHtml);

function withIdsAndSources(channel, points) {
  return points.map((point, index) => ({
    id: `${channel.id}-${String(index + 1).padStart(3, "0")}`,
    ...point,
    sourceIds: channel.sourceIds
  }));
}

const channels = CHANNELS.map((channel) => ({
  ...channel,
  locations: withIdsAndSources(channel, locationsByChannel[channel.id] || [])
})).filter((channel) => channel.locations.length > 0);

const dataset = {
  sourceNote: "Point lists captured from the official DSPA website. Collection points change over time; re-run the importer and check the linked source before relying on a location.",
  coordinateNote: "Only the Eco Fun network (stations, mobile truck, street stations, service points and community points) publishes official coordinates. Other channels publish an address only, so they are excluded from the nearest-point search.",
  accessed: ACCESSED,
  sources: Object.entries(SOURCES).map(([id, source]) => ({ id, ...source, accessed: ACCESSED })),
  channels
};

const outputUrl = new URL("../data/macau-recycling-points.json", import.meta.url);
writeFileSync(outputUrl, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

const summary = channels.map((channel) => `${channel.id}: ${channel.locations.length}`).join(", ");
console.log(`Wrote ${outputUrl.pathname}`);
console.log(`Channels -> ${summary}`);
console.log(`Total points: ${channels.reduce((total, channel) => total + channel.locations.length, 0)}`);
