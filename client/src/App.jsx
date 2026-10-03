import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  ExternalLink,
  ImagePlus,
  Leaf,
  LoaderCircle,
  Recycle,
  RefreshCcw,
  ShieldCheck,
  Upload
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [screen, setScreen] = useState("capture");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [quizChoice, setQuizChoice] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  function selectFile(nextFile) {
    setError("");
    setResult(null);
    setQuizChoice(null);
    setQuizSubmitted(false);
    setScreen("capture");

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

    setError("");
    setResult(null);
    setQuizChoice(null);
    setQuizSubmitted(false);
    setScreen("loading");

    const body = new FormData();
    body.append("image", file);

    try {
      const response = await fetch(`${API_URL}/api/classify`, { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "The image could not be classified right now.");
      }
      setResult(payload);
      setScreen("result");
    } catch (requestError) {
      setError(requestError.message || "The network connection failed. Please try again.");
      setScreen("capture");
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
    setScreen("capture");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  function backToCamera() {
    setError("");
    setScreen("capture");
  }

  return (
    <main className={`app-shell screen-${screen}`}>
      {screen === "capture" && (
        <CaptureScreen
          file={file}
          previewUrl={previewUrl}
          error={error}
          cameraInputRef={cameraInputRef}
          uploadInputRef={uploadInputRef}
          onFile={selectFile}
          onAnalyze={analyzeImage}
          onReset={resetScan}
        />
      )}
      {screen === "loading" && <LoadingScreen previewUrl={previewUrl} onBack={backToCamera} />}
      {screen === "result" && (
        <ResultScreen
          result={result}
          quizChoice={quizChoice}
          quizSubmitted={quizSubmitted}
          onChoice={setQuizChoice}
          onSubmit={() => setQuizSubmitted(true)}
          onBack={backToCamera}
          onReset={resetScan}
        />
      )}
    </main>
  );
}

function CaptureScreen({ file, previewUrl, error, cameraInputRef, uploadInputRef, onFile, onAnalyze, onReset }) {
  const hasPreview = Boolean(file && previewUrl);

  return (
    <section className="capture-screen" aria-labelledby="page-title">
      <header className="capture-header">
        <a className="brand brand-light" href="/" aria-label="EcoScan AI home">
          <span className="brand-mark" aria-hidden="true"><Recycle size={17} strokeWidth={2.5} /></span>
          <span>EcoScan AI</span>
        </a>
        <span className="capture-mode"><span className="mode-dot" aria-hidden="true" /> Macau / camera mode</span>
      </header>

      <div className="capture-layout">
        <div className="capture-copy">
          <p className="eyebrow">Waste sorting / 01</p>
          <h1 id="page-title">See it. Sort it.</h1>
          <p className="intro-copy">One photo, one clear next step. Built for Macau classrooms.</p>
          <p className="privacy-note"><ShieldCheck size={16} aria-hidden="true" /> Images are processed for this scan and are not intentionally stored.</p>
        </div>

        <section className="camera-card" aria-label="EcoScan camera">
          <div className="camera-card-header">
            <div>
              <p className="camera-kicker">Live preview</p>
              <p className="camera-subtitle">{hasPreview ? "Ready to analyze" : "Center the item in frame"}</p>
            </div>
            <span className="lens-pill">AI / local rules</span>
          </div>

          <div className="camera-stage">
            {hasPreview ? (
              <img className="camera-image" src={previewUrl} alt="Selected item preview" />
            ) : (
              <div className="camera-empty">
                <span className="camera-empty-icon" aria-hidden="true"><Camera size={25} strokeWidth={1.8} /></span>
                <strong>Ready when you are</strong>
                <span>Use your camera or choose a photo</span>
              </div>
            )}
            <span className="viewfinder viewfinder-tl" aria-hidden="true" />
            <span className="viewfinder viewfinder-tr" aria-hidden="true" />
            <span className="viewfinder viewfinder-bl" aria-hidden="true" />
            <span className="viewfinder viewfinder-br" aria-hidden="true" />
            <div className="camera-stage-footer">
              <span>{hasPreview ? "Image selected" : "No image selected"}</span>
              <span>JPG / PNG / WEBP</span>
            </div>
          </div>

          {error && <div className="alert" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {error}</div>}

          <div className="camera-controls">
            <button className="round-control" type="button" onClick={() => uploadInputRef.current?.click()} aria-label="Upload an image">
              <ImagePlus size={19} aria-hidden="true" />
            </button>
            <button className={`shutter-control ${hasPreview ? "shutter-ready" : ""}`} type="button" onClick={hasPreview ? onAnalyze : () => cameraInputRef.current?.click()} aria-label={hasPreview ? "Analyze selected item" : "Take a photo"}>
              {hasPreview ? <ArrowUpRight size={25} aria-hidden="true" /> : <Camera size={25} aria-hidden="true" />}
            </button>
            <button className="round-control" type="button" onClick={hasPreview ? onReset : () => cameraInputRef.current?.click()} aria-label={hasPreview ? "Choose another image" : "Open camera"}>
              {hasPreview ? <RefreshCcw size={19} aria-hidden="true" /> : <Upload size={19} aria-hidden="true" />}
            </button>
            <input ref={cameraInputRef} className="visually-hidden" tabIndex={-1} aria-label="Take a photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => onFile(event.target.files?.[0])} />
            <input ref={uploadInputRef} className="visually-hidden" tabIndex={-1} aria-label="Upload image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} />
          </div>
          <p className="shutter-label">{hasPreview ? "Analyze item" : "Tap to capture"}</p>
          <p className="camera-disclaimer"><AlertTriangle size={13} aria-hidden="true" /> AI results are learning guidance. Check current local rules before disposal.</p>
        </section>
      </div>

      <footer className="capture-footer">
        <span>AI for Social Innovation · SDG 12 / SDG 13</span>
        <span>Designed for phone, tablet and desktop</span>
      </footer>
    </section>
  );
}

CaptureScreen.propTypes = {
  file: PropTypes.object,
  previewUrl: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired,
  cameraInputRef: PropTypes.object.isRequired,
  uploadInputRef: PropTypes.object.isRequired,
  onFile: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired
};

function LoadingScreen({ previewUrl, onBack }) {
  return (
    <section className="loading-screen" aria-live="polite" aria-busy="true">
      <ScreenHeader onBack={onBack} label="Back to camera" />
      <div className="loading-card">
        {previewUrl && <img className="loading-image" src={previewUrl} alt="Image being analyzed" />}
        <div className="loading-shade" />
        <div className="loading-content">
          <LoaderCircle className="loading-spinner" size={42} aria-hidden="true" />
          <p className="eyebrow">Reading the item / 02</p>
          <h1>Checking the evidence.</h1>
          <p>Identifying the material, checking the supplied Macau guidance, and preparing your learning tips.</p>
        </div>
      </div>
    </section>
  );
}

LoadingScreen.propTypes = {
  previewUrl: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired
};

function ResultScreen({ result, quizChoice, quizSubmitted, onChoice, onSubmit, onBack, onReset }) {
  if (!result) return null;
  const isLowConfidence = result.confidence < 0.65;
  const confidenceLabel = `${Math.round(result.confidence * 100)}% confidence`;

  return (
    <section className="result-screen" aria-labelledby="result-title">
      <ScreenHeader onBack={onBack} label="Back to camera" />
      <div className="result-content">
        <div className="result-intro">
          <div>
            <p className="eyebrow">Analysis complete / 03</p>
            <h1 id="result-title">{result.itemName}</h1>
            <p>Here is the clearest next step from the image and the supplied Macau guidance.</p>
          </div>
          <button className="new-scan-button" type="button" onClick={onReset}><RefreshCcw size={16} aria-hidden="true" /> New scan</button>
        </div>

        <div className="result-overview">
          <article className="result-hero-card">
            <div className="result-label">Recommended sort</div>
            <div className="result-sort-row">
              <span className={`category-badge category-${result.category}`}>{formatCategory(result.category)}</span>
              <span className={`recycle-status ${result.recyclable === null ? "is-unknown" : result.recyclable ? "is-recyclable" : "is-not-recyclable"}`}>
                {result.recyclable === null ? "Check locally" : result.recyclable ? "Recyclable" : "General waste"}
              </span>
            </div>
            <div className="confidence-row"><span>{confidenceLabel}</span><span className="confidence-track"><span style={{ width: `${Math.round(result.confidence * 100)}%` }} /></span></div>
            {(isLowConfidence || result.category === "unknown" || result.sourceNeeded) && <p className="notice-text">Use this as a learning aid and check the current local collection rule before disposal.</p>}
          </article>

          <article className="result-detail-card">
            <div className="result-label">Decision trace</div>
            <p className="result-copy">{result.reason || "No explanation was returned."}</p>
            <div className="result-label">Cleaning protocol</div>
            {result.cleaningSteps.length ? <ol className="steps-list">{result.cleaningSteps.map((step) => <li key={step}>{step}</li>)}</ol> : <p className="muted-copy">No cleaning steps were returned.</p>}
          </article>

          <article className="result-detail-card learning-result-card">
            <div className="result-label"><Leaf size={15} aria-hidden="true" /> Learning signal</div>
            <p className="result-copy">{result.learningFact || "The AI did not return a learning fact."}</p>
            {result.safetyNote && <p className="safety-note"><strong>Safety:</strong> {result.safetyNote}</p>}
            {result.sources?.length > 0 && <div className="sources-block"><div className="result-label">Sources</div>{result.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={13} aria-hidden="true" /></a>)}</div>}
          </article>
        </div>

        {result.quiz && <Quiz quiz={result.quiz} choice={quizChoice} submitted={quizSubmitted} onChoice={onChoice} onSubmit={onSubmit} />}
      </div>
    </section>
  );
}

ResultScreen.propTypes = {
  result: PropTypes.shape({
    itemName: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    recyclable: PropTypes.bool,
    confidence: PropTypes.number.isRequired,
    reason: PropTypes.string,
    cleaningSteps: PropTypes.arrayOf(PropTypes.string).isRequired,
    learningFact: PropTypes.string,
    safetyNote: PropTypes.string,
    sourceNeeded: PropTypes.bool,
    sources: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string, url: PropTypes.string })),
    quiz: PropTypes.shape({
      question: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(PropTypes.string).isRequired,
      answerIndex: PropTypes.number.isRequired,
      explanation: PropTypes.string.isRequired
    })
  }),
  quizChoice: PropTypes.number,
  quizSubmitted: PropTypes.bool.isRequired,
  onChoice: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired
};

function ScreenHeader({ onBack, label }) {
  return (
    <header className="screen-header">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> {label}</button>
      <span className="screen-header-brand"><Recycle size={15} aria-hidden="true" /> EcoScan AI</span>
    </header>
  );
}

ScreenHeader.propTypes = {
  onBack: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired
};

function Quiz({ quiz, choice, submitted, onChoice, onSubmit }) {
  const isCorrect = submitted && choice === quiz.answerIndex;
  return (
    <article className="quiz-card" aria-labelledby="quiz-title">
      <div>
        <p className="eyebrow">Knowledge check</p>
        <h2 id="quiz-title">Quick check</h2>
        <p className="quiz-question">{quiz.question}</p>
      </div>
      <div className="quiz-options">
        {quiz.options.map((option, index) => <label className={`quiz-option ${submitted && index === quiz.answerIndex ? "correct" : ""} ${submitted && choice === index && index !== quiz.answerIndex ? "incorrect" : ""}`} key={option}><input type="radio" name="quiz" checked={choice === index} onChange={() => onChoice(index)} disabled={submitted} /><span>{option}</span></label>)}
      </div>
      {!submitted ? <button className="quiz-submit" type="button" disabled={choice === null} onClick={onSubmit}><Check size={17} aria-hidden="true" /> Check answer</button> : <div className={`quiz-feedback ${isCorrect ? "correct" : "incorrect"}`} role="status">{isCorrect ? <Check size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />} <strong>{isCorrect ? "Correct." : "Keep learning."}</strong> {quiz.explanation}</div>}
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
