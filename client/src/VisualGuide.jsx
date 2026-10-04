import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { BookOpen, ImageOff, LoaderCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function VisualGuide({ guide }) {
  const [view, setView] = useState(guide || { status: "skipped", message: "No educational illustration is available for this scan." });
  useEffect(() => {
    setView(guide || { status: "skipped", message: "No educational illustration is available for this scan." });
    if (guide?.status !== "pending" || !guide.scanId) return;
    const request = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; request.abort(); }, 95_000);
    setView({ status: "loading" });
    async function generate() {
      try {
        const response = await fetch(`${API_URL}/api/visual-guide`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId: guide.scanId }), signal: request.signal
        });
        const payload = await response.json();
        if (request.signal.aborted) return;
        if (!response.ok || !["ready", "skipped", "failed", "unavailable"].includes(payload?.status)) throw new Error("Invalid visual guide response");
        if (payload.status === "ready" && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(payload.imageUrl || "") ||
            typeof payload.title !== "string" || !Array.isArray(payload.parts) || !payload.parts.length ||
            !payload.parts.every((part) => part && [part.name, part.material, part.note].every((text) => typeof text === "string")))) {
          throw new Error("Invalid educational illustration");
        }
        setView(payload);
      } catch {
        if (!request.signal.aborted || timedOut) {
          setView({ status: "failed", message: timedOut ? "The educational image service took too long. Your sorting result is still available." : "The educational image is unavailable. Your sorting result is still available." });
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }
    generate();
    return () => { window.clearTimeout(timeout); request.abort(); };
  }, [guide]);

  const isLoading = view.status === "loading" || view.status === "pending";
  return (
    <section className="visual-guide" aria-labelledby="visual-guide-title" aria-busy={isLoading}>
      <header className="visual-guide-header">
        <div><p className="result-label"><BookOpen size={15} aria-hidden="true" /> Material notebook</p><h2 id="visual-guide-title">{view.title || "Parts and materials"}</h2></div>
        {view.status === "ready" && <span className="visual-guide-badge">AI illustration</span>}
      </header>
      {view.status === "ready" ? (
        <>
          <div className="visual-guide-layout">
            <figure className="visual-guide-image">
              <img src={view.imageUrl} alt={`Simplified educational illustration of ${view.title}`} onError={() => setView({ status: "failed", message: "The educational image could not be displayed. Your sorting result is still available." })} />
              <figcaption>AI-generated educational illustration</figcaption>
            </figure>
            <ol className="material-parts">
              {view.parts.map((part, index) => <li key={`${index}-${part.name}`}><span className="material-part-number" aria-hidden="true">{index + 1}</span><div><h3>{part.name}</h3><p className="material-part-material">{part.material}</p><p>{part.note}</p></div></li>)}
            </ol>
          </div>
          <p className="visual-guide-note">{view.disclaimer || "Simplified AI estimates; the exact product structure and materials are not verified."}</p>
        </>
      ) : (
        <div className="visual-guide-state" role="status">
          {isLoading ? <LoaderCircle className="visual-guide-spinner" size={25} aria-hidden="true" /> : <ImageOff size={23} aria-hidden="true" />}
          <div><strong>{isLoading ? "Drawing your material guide" : view.status === "skipped" ? "Illustration skipped" : "Illustration unavailable"}</strong><p>{isLoading ? "Preparing a simplified educational illustration." : view.message}</p></div>
        </div>
      )}
    </section>
  );
}

VisualGuide.propTypes = {
  guide: PropTypes.shape({ status: PropTypes.string.isRequired, scanId: PropTypes.string, message: PropTypes.string })
};
