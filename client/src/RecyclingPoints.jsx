import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Phone,
  Recycle,
  Search
} from "lucide-react";

const REGIONS = [
  { id: "", label: "All areas" },
  { id: "macau", label: "Macau" },
  { id: "taipa", label: "Taipa" },
  { id: "coloane", label: "Coloane" }
];

const ACCEPT_LABELS = {
  paper: "Paper",
  plastic: "Plastic",
  metal: "Metal",
  glass: "Glass",
  electronic: "Electronics",
  battery: "Batteries",
  clothes: "Clothing",
  lamp: "Light tubes"
};

const PAGE_SIZE = 60;
const MAX_PAGE = 500;

const NEARBY_CATEGORIES = {
  plastic: "plastic",
  paper: "paper",
  metal: "metal",
  glass: "glass",
  electronic: "batteries and electronics"
};

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Recycling point finder backed by the DSPA data captured on the server.
 * It lists the available channels, then loads the points for the chosen
 * channel with region filtering and free-text search.
 */
export default function RecyclingPoints({ apiUrl = "", onBack, initialChannelId = null, initialCategory = null }) {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(initialChannelId);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [region, setRegion] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [geo, setGeo] = useState({ status: "idle", error: "", result: null });
  const [reloadKey, setReloadKey] = useState(0);
  const detailRequestRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    fetch(`${apiUrl}/api/recycling-points`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.channels) throw new Error(payload?.message || "The recycling point list is unavailable right now.");
        setSummary(payload);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError.message || "The recycling point list is unavailable right now.");
        setStatus("error");
      });
    return () => controller.abort();
  }, [apiUrl, reloadKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setLimit(PAGE_SIZE);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const loadDetail = useCallback(async (channelId, nextRegion, nextQuery, nextLimit) => {
    if (!channelId) return;
    detailRequestRef.current?.abort();
    const controller = new AbortController();
    detailRequestRef.current = controller;
    setDetailStatus("loading");
    const params = [];
    if (nextRegion) params.push(`region=${encodeURIComponent(nextRegion)}`);
    if (nextQuery) params.push(`q=${encodeURIComponent(nextQuery)}`);
    params.push(`limit=${nextLimit}`);
    try {
      const response = await fetch(`${apiUrl}/api/recycling-points/${encodeURIComponent(channelId)}?${params.join("&")}`, { signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.channel) throw new Error(payload?.message || "These recycling points could not be loaded.");
      setDetail(payload);
      setDetailStatus("ready");
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setDetail(null);
      setDetailStatus("error");
      setError(requestError.message || "These recycling points could not be loaded.");
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId, region, query, limit);
  }, [selectedId, region, query, limit, loadDetail]);

  useEffect(() => () => detailRequestRef.current?.abort(), []);

  function openChannel(channelId) {
    setError("");
    setDetail(null);
    setRegion("");
    setQueryInput("");
    setQuery("");
    setLimit(PAGE_SIZE);
    setSelectedId(channelId);
    window.scrollTo(0, 0);
  }

  function backToChannels() {
    setSelectedId(null);
    setDetail(null);
    setError("");
  }

  function findNearby() {
    if (!navigator.geolocation?.getCurrentPosition) {
      setGeo({ status: "error", error: "Your browser cannot share a location. Browse the list below instead.", result: null });
      return;
    }
    setGeo({ status: "locating", error: "", result: null });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const categoryParam = NEARBY_CATEGORIES[initialCategory] ? `&category=${encodeURIComponent(initialCategory)}` : "";
        try {
          const response = await fetch(`${apiUrl}/api/recycling-points/nearby?lat=${latitude}&lng=${longitude}&limit=5${categoryParam}`);
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.locations) throw new Error(payload?.message || "Nearby points could not be loaded.");
          setGeo({ status: "ready", error: "", result: payload });
        } catch (requestError) {
          setGeo({ status: "error", error: requestError.message || "Nearby points could not be loaded.", result: null });
        }
      },
      (locationError) => {
        const message = locationError?.code === 1
          ? "Location permission was denied. Allow location access or browse the list below."
          : "Your location could not be determined. You can still browse the list below.";
        setGeo({ status: "error", error: message, result: null });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <section className="points-screen" aria-labelledby="points-title">
      <header className="screen-header">
        <button className="back-button" type="button" onClick={selectedId ? backToChannels : onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> {selectedId ? "All channels" : "Back to scan"}
        </button>
        <span className="screen-header-brand"><span>EcoScan</span> AI</span>
        <MapPin className="screen-header-profile" size={19} aria-hidden="true" />
      </header>

      <div className="points-content">
        <div className="points-intro">
          <p className="eyebrow">Drop-off finder</p>
          <h1 id="points-title">{selectedId && detail ? detail.channel.name : "Where to recycle it"}</h1>
          <p className="points-lede">
            Collection points published by the Macao Environmental Protection Bureau (DSPA). Point lists change over time, so confirm on the official page before travelling.
          </p>
          {summary?.accessed && (
            <p className="points-meta">
              <Info size={14} aria-hidden="true" /> Captured from the DSPA website on {summary.accessed}.
            </p>
          )}
          <div className="points-actions">
            <button className="points-near" type="button" onClick={findNearby} disabled={geo.status === "locating"}>
              {geo.status === "locating" ? <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}
              {geo.status === "locating" ? "Finding your location…" : "Nearest to me"}
            </button>
            <span className="points-actions-note">
              {NEARBY_CATEGORIES[initialCategory]
                ? `Shows the nearest place that accepts ${NEARBY_CATEGORIES[initialCategory]}. Uses your device location.`
                : "Uses your device location. Only the Eco Fun network publishes official coordinates."}
            </span>
          </div>
        </div>

        {geo.status === "error" && <div className="alert points-alert" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {geo.error}</div>}

        {geo.status === "ready" && geo.result && (
          <section className="points-nearby" aria-labelledby="points-nearby-title">
            <div className="points-nearby-head">
              <h2 id="points-nearby-title">Nearest drop-off points</h2>
              <button className="points-nearby-clear" type="button" onClick={() => setGeo({ status: "idle", error: "", result: null })}>Clear</button>
            </div>
            {geo.result.locations.length === 0 ? (
              <p className="points-empty">No points with published coordinates were found.</p>
            ) : (
              <ol className="points-list">
                {geo.result.locations.map((location) => (
                  <li className="points-item" key={`${location.channelId}-${location.id}`}>
                    <div className="points-item-main">
                      <strong>{location.name}</strong>
                      <span className="points-address">{location.address}</span>
                      <span className="points-item-meta">
                        <span className="points-distance">{formatDistance(location.distanceMeters)} away</span>
                        <span>{location.channelName}</span>
                        {location.hours && <span><Clock size={13} aria-hidden="true" /> {location.hours}</span>}
                        {location.phone && <span><Phone size={13} aria-hidden="true" /> {location.phone}</span>}
                      </span>
                    </div>
                    {location.link && <a className="points-map" href={location.link} target="_blank" rel="noreferrer">Map <ExternalLink size={12} aria-hidden="true" /></a>}
                  </li>
                ))}
              </ol>
            )}
            <p className="points-note">{geo.result.coordinateNote}</p>
          </section>
        )}

        {error && <div className="alert points-alert" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {error}</div>}

        {status === "loading" && !summary && (
          <div className="points-loading" aria-live="polite"><LoaderCircle className="loading-spinner" size={48} aria-hidden="true" /><span>Loading recycling points…</span></div>
        )}

        {status === "error" && !summary && (
          <button className="points-retry" type="button" onClick={() => setReloadKey((current) => current + 1)}>Try again</button>
        )}

        {summary && !selectedId && (
          <div className="points-channel-grid">
            {summary.channels.map((channel) => (
              <article className="points-channel-card" key={channel.id}>
                <div className="points-channel-head">
                  <h2>{channel.name}</h2>
                  {channel.nameZh && <span className="points-channel-zh">{channel.nameZh}</span>}
                </div>
                <p className="points-channel-note">{channel.note}</p>
                <div className="points-accepts">
                  {channel.accepts.map((accept) => <span className="points-accept" key={accept}>{ACCEPT_LABELS[accept] || accept}</span>)}
                </div>
                <div className="points-channel-foot">
                  <span className="points-count"><Recycle size={15} aria-hidden="true" /> {channel.count} points</span>
                  <button className="points-open" type="button" onClick={() => openChannel(channel.id)}>View points</button>
                </div>
              </article>
            ))}
          </div>
        )}

        {selectedId && detail && (
          <div className="points-detail">
            <div className="points-detail-bar">
              <div className="points-region-tabs" role="group" aria-label="Filter by area">
                {REGIONS.map((item) => (
                  <button
                    className={`points-region-tab ${region === item.id ? "is-active" : ""}`}
                    type="button"
                    key={item.id || "all"}
                    aria-pressed={region === item.id}
                    onClick={() => { setRegion(item.id); setLimit(PAGE_SIZE); }}
                  >
                    {item.label}
                    <span>{item.id ? detail.channel.regions[item.id] : detail.channel.count}</span>
                  </button>
                ))}
              </div>
              <label className="points-search">
                <Search size={16} aria-hidden="true" />
                <span className="visually-hidden">Search this channel</span>
                <input type="search" value={queryInput} placeholder="Search name or address" onChange={(event) => setQueryInput(event.target.value)} />
              </label>
            </div>

            {detail.channel.officialFinder && (
              <p className="points-official">
                <a href={detail.channel.officialFinder} target="_blank" rel="noreferrer">Open the official DSPA list <ExternalLink size={13} aria-hidden="true" /></a>
              </p>
            )}

            {detailStatus === "loading" && !detail.locations.length && (
              <div className="points-loading" aria-live="polite"><LoaderCircle className="loading-spinner" size={40} aria-hidden="true" /><span>Loading points…</span></div>
            )}

            {detailStatus !== "loading" && detail.total === 0 && (
              <p className="points-empty">No points match this filter. Try another area or a shorter search.</p>
            )}

            <ol className="points-list">
              {detail.locations.map((location) => (
                <li className="points-item" key={location.id}>
                  <div className="points-item-main">
                    <strong>{location.name}</strong>
                    <span className="points-address">{location.address}</span>
                    {location.detail && <span className="points-detail-line">{location.detail}</span>}
                    <span className="points-item-meta">
                      {location.hours && <span><Clock size={13} aria-hidden="true" /> {location.hours}</span>}
                      {location.phone && <span><Phone size={13} aria-hidden="true" /> {location.phone}</span>}
                    </span>
                  </div>
                  {location.link && (
                    <a className="points-map" href={location.link} target="_blank" rel="noreferrer">Map <ExternalLink size={12} aria-hidden="true" /></a>
                  )}
                </li>
              ))}
            </ol>

            {detail.total > detail.locations.length && detail.locations.length < MAX_PAGE && (
              <button className="points-more" type="button" onClick={() => setLimit((current) => Math.min(current + PAGE_SIZE, MAX_PAGE))}>
                Show more ({detail.locations.length} of {detail.total})
              </button>
            )}
            {detail.total > MAX_PAGE && detail.locations.length >= MAX_PAGE && (
              <p className="points-empty">Showing the first {MAX_PAGE} of {detail.total} points. Use the area filter or search to narrow the list.</p>
            )}

            {detail.sources?.length > 0 && (
              <div className="points-sources">
                <div className="result-label">Source</div>
                {detail.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={13} aria-hidden="true" /></a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

RecyclingPoints.propTypes = {
  apiUrl: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  initialChannelId: PropTypes.string,
  initialCategory: PropTypes.string
};
