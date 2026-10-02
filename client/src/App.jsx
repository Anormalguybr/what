import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quizChoice, setQuizChoice] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(nextFile) {
    setError("");
    setResult(null);
    setQuizChoice(null);
    setQuizSubmitted(false);

    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) {
      clearPreview();
      setFile(null);
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      clearPreview();
      setFile(null);
      setError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      clearPreview();
      setFile(null);
      setError("Please choose an image smaller than 10 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  async function analyzeImage() {
    if (!file) {
      setError("Choose an image before starting a scan.");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);
    setQuizChoice(null);
    setQuizSubmitted(false);

    const body = new FormData();
    body.append("image", file);

    try {
      const response = await fetch(`${API_URL}/api/classify`, { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "The image could not be classified right now.");
      }
      setResult(payload);
    } catch (requestError) {
      setError(requestError.message || "The network connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetScan() {
    setFile(null);
    setResult(null);
    setError("");
    setQuizChoice(null);
    setQuizSubmitted(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  const confidenceLabel = result ? `${Math.round(result.confidence * 100)}% confidence` : "";
  const isLowConfidence = result && result.confidence < 0.65;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="EcoScan AI home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>EcoScan AI</span>
        </a>
        <span className="status-chip">Learning prototype</span>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">Scan. Sort. Learn.</p>
          <h1 id="page-title">Make every item count.</h1>
          <p className="hero-text">
            Use a photo to explore how an item may be sorted under Macau guidance. EcoScan AI explains the decision in clear English so students can learn while they sort.
          </p>
          <p className="privacy-note">Images are processed for this scan and are not intentionally stored. Do not upload personal or sensitive images.</p>
        </div>

        <div className="scanner-panel" aria-label="Image scanner">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Step 1</p>
              <h2>Choose an item</h2>
            </div>
            <span className="panel-count">1 / 3</span>
          </div>

          <div className="capture-actions">
            <button className="action-button action-primary" type="button" onClick={() => cameraInputRef.current?.click()}>
              Take a photo
            </button>
            <button className="action-button action-secondary" type="button" onClick={() => uploadInputRef.current?.click()}>
              Upload image
            </button>
            <input ref={cameraInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectFile(event.target.files?.[0])} />
            <input ref={uploadInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />
          </div>

          {previewUrl ? (
            <div className="preview-wrap">
              <img className="preview-image" src={previewUrl} alt="Selected item preview" />
              <button className="text-button" type="button" onClick={resetScan}>Choose another image</button>
            </div>
          ) : (
            <div className="empty-preview">
              <span className="empty-icon" aria-hidden="true">+</span>
              <p>Your image preview will appear here.</p>
              <span>JPEG, PNG, or WebP · up to 10 MB</span>
            </div>
          )}

          {error && <div className="alert" role="alert">{error}</div>}

          <button className="scan-button" type="button" disabled={!file || isLoading} onClick={analyzeImage}>
            {isLoading ? "Analyzing image..." : "Analyze image"}
          </button>
          <p className="source-hint">AI output is a learning aid. Check current local guidance for final disposal decisions.</p>
        </div>
      </section>

      {result && (
        <section className="results-section" aria-labelledby="result-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2 id="result-title">What EcoScan found</h2>
            </div>
            <button className="text-button" type="button" onClick={resetScan}>Start a new scan</button>
          </div>

          <div className="result-grid">
            <article className="result-card result-summary">
              <div className="result-label">Item</div>
              <h3>{result.itemName}</h3>
              <div className="category-row">
                <span className={`category-badge category-${result.category}`}>{formatCategory(result.category)}</span>
                <span className={`recycle-status ${result.recyclable === null ? "is-unknown" : result.recyclable ? "is-recyclable" : "is-not-recyclable"}`}>
                  {result.recyclable === null ? "Check locally" : result.recyclable ? "Recyclable" : "Not recyclable"}
                </span>
              </div>
              <div className="confidence-row">
                <span>{confidenceLabel}</span>
                <span className="confidence-track"><span style={{ width: `${Math.round(result.confidence * 100)}%` }} /></span>
              </div>
              {(isLowConfidence || result.category === "unknown" || result.sourceNeeded) && (
                <p className="notice-text">This result needs a local check. Use the cited guidance before making a final disposal decision.</p>
              )}
            </article>

            <article className="result-card">
              <div className="result-label">Why this category?</div>
              <p className="result-copy">{result.reason || "No explanation was returned."}</p>
              <div className="result-label">Cleaning steps</div>
              {result.cleaningSteps.length ? (
                <ol className="steps-list">{result.cleaningSteps.map((step) => <li key={step}>{step}</li>)}</ol>
              ) : <p className="muted-copy">No cleaning steps were returned.</p>}
            </article>

            <article className="result-card learning-card">
              <div className="result-label">Learn something new</div>
              <p className="result-copy">{result.learningFact || "The AI did not return a learning fact."}</p>
              {result.safetyNote && <p className="safety-note"><strong>Safety:</strong> {result.safetyNote}</p>}
              {result.sources?.length > 0 && (
                <div className="sources-block">
                  <div className="result-label">Sources</div>
                  {result.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>)}
                </div>
              )}
            </article>
          </div>

          {result.quiz && <Quiz quiz={result.quiz} choice={quizChoice} submitted={quizSubmitted} onChoice={setQuizChoice} onSubmit={() => setQuizSubmitted(true)} />}
        </section>
      )}

      <footer className="footer">
        <span>EcoScan AI · AI for Social Innovation · SDG 12 / SDG 13</span>
        <span>Prototype for classroom learning</span>
      </footer>
    </main>
  );
}

function Quiz({ quiz, choice, submitted, onChoice, onSubmit }) {
  const isCorrect = submitted && choice === quiz.answerIndex;
  return (
    <article className="quiz-card" aria-labelledby="quiz-title">
      <div>
        <p className="eyebrow">Step 3</p>
        <h2 id="quiz-title">Quick check</h2>
        <p className="quiz-question">{quiz.question}</p>
      </div>
      <div className="quiz-options">
        {quiz.options.map((option, index) => (
          <label className={`quiz-option ${submitted && index === quiz.answerIndex ? "correct" : ""} ${submitted && choice === index && index !== quiz.answerIndex ? "incorrect" : ""}`} key={option}>
            <input type="radio" name="quiz" checked={choice === index} onChange={() => onChoice(index)} disabled={submitted} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {!submitted ? (
        <button className="quiz-submit" type="button" disabled={choice === null} onClick={onSubmit}>Check answer</button>
      ) : (
        <div className={`quiz-feedback ${isCorrect ? "correct" : "incorrect"}`} role="status">
          <strong>{isCorrect ? "Correct." : "Keep learning."}</strong> {quiz.explanation}
        </div>
      )}
    </article>
  );
}

Quiz.propTypes = {
  quiz: PropTypes.shape({
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    answerIndex: PropTypes.number.isRequired,
    explanation: PropTypes.string.isRequired
  }).isRequired,
  choice: PropTypes.number,
  submitted: PropTypes.bool.isRequired,
  onChoice: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

function formatCategory(category) {
  return category.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
