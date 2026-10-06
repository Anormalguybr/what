import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, Clock, ExternalLink, LoaderCircle, LocateFixed, MapPin, Navigation, Phone } from "lucide-react";

// Scan categories that can be matched to a recycling stream, with a readable
// label for the "nearest place that accepts ..." text.
const STREAM_LABELS = {
  plastic: "plastic",
  paper: "paper and cardboard",
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
 * After a scan, ask the browser for the user's position and show the closest
 * drop-off points whose channel accepts the scanned material. The category is
 * sent to the server, so a suggestion is never a place that does not take it.
 */
export default function NearestPoint({ apiUrl = "", category, onOpenPoints }) {
  const [state, setState] = useState({ status: "locating", error: "", result: null });
  const supported = Object.prototype.hasOwnProperty.call(STREAM_LABELS, category);

  const locate = useCallback(() => {
    if (!navigator.geolocation?.getCurrentPosition) {
      setState({ status: "unsupported", error: "This browser cannot share a location.", result: null });
      return;
    }
    setState({ status: "locating", error: "", result: null });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const params = `lat=${latitude}&lng=${longitude}&category=${encodeURIComponent(category)}&limit=3`;
        try {
          const response = await fetch(`${apiUrl}/api/recycling-points/nearby?${params}`);
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.locations) throw new Error(payload?.message || "Nearby points could not be loaded.");
          setState({ status: "ready", error: "", result: payload });
        } catch (requestError) {
          setState({ status: "error", error: requestError.message || "Nearby points could not be loaded.", result: null });
        }
      },
      (locationError) => {
        const message = locationError?.code === 1
          ? "Location permission was denied."
          : "Your location could not be determined.";
        setState({ status: "denied", error: message, result: null });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [apiUrl, category]);

  useEffect(() => {
    if (supported) locate();
  }, [supported, locate]);

  if (!supported) return null;

  const label = STREAM_LABELS[category];
  const locations = state.status === "ready" ? state.result.locations : [];

  return (
    <section className="nearest-point" aria-labelledby="nearest-point-title">
      <div className="nearest-point-head">
        <div>
          <p className="eyebrow">Nearest drop-off</p>
          <h2 id="nearest-point-title">Where to take it</h2>
        </div>
        {state.status !== "locating" && (
          <button className="nearest-retry" type="button" onClick={locate}>
            <LocateFixed size={15} aria-hidden="true" /> {state.status === "ready" ? "Refresh" : "Use my location"}
          </button>
        )}
      </div>

      {state.status === "locating" && (
        <p className="nearest-status" aria-live="polite">
          <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" /> Finding the nearest place that accepts {label}…
        </p>
      )}

      {(state.status === "denied" || state.status === "unsupported" || state.status === "error") && (
        <div className="nearest-status is-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" /> {state.error} You can still browse every drop-off point.
        </div>
      )}

      {state.status === "ready" && locations.length === 0 && (
        <div className="nearest-status is-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" /> No nearby point that accepts {label} was found. {state.result.coordinateNote}
        </div>
      )}

      {state.status === "ready" && locations.length > 0 && (
        <>
          <ol className="nearest-list">
            {locations.map((location, index) => (
              <li className={`nearest-item ${index === 0 ? "is-primary" : ""}`} key={`${location.channelId}-${location.id}`}>
                <span className="nearest-distance"><Navigation size={13} aria-hidden="true" /> {formatDistance(location.distanceMeters)}</span>
                <strong>{location.name}</strong>
                <span className="nearest-address">{location.address}</span>
                <span className="nearest-meta">
                  <span>{location.channelName}</span>
                  {location.hours && <span><Clock size={12} aria-hidden="true" /> {location.hours}</span>}
                  {location.phone && <span><Phone size={12} aria-hidden="true" /> {location.phone}</span>}
                </span>
                {location.link && <a className="points-map" href={location.link} target="_blank" rel="noreferrer">Map <ExternalLink size={12} aria-hidden="true" /></a>}
              </li>
            ))}
          </ol>
          <p className="nearest-note">{state.result.coordinateNote}</p>
        </>
      )}

      <button className="nearest-all" type="button" onClick={() => onOpenPoints(null, category)}>
        <MapPin size={16} aria-hidden="true" /> See all drop-off points
      </button>
    </section>
  );
}

NearestPoint.propTypes = {
  apiUrl: PropTypes.string,
  category: PropTypes.string.isRequired,
  onOpenPoints: PropTypes.func.isRequired
};
