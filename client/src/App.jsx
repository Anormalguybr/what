import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import VisualGuide from "./VisualGuide.jsx";
import { CameraControls, useCamera } from "./CameraControls.jsx";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  ImagePlus,
  Info,
  Leaf,
  LoaderCircle,
  Recycle,
  UserRound
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisRequestRef = useRef(null);

  const {
    cameraActive,
    cameraPaused,
    cameraError,
    setCameraError,
    stopCamera,
    turnCameraOn,
    turnCameraOff,
    captureFrame
  } = useCamera({
    screen,
    hasImage: Boolean(file),
    videoRef,
    canvasRef,
    onCapture: selectFile
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => () => analysisRequestRef.current?.abort(), []);

  function selectFile(nextFile) {
    setError("");
    setResult(null);
    setQuizChoice(null);
    setQuizSubmitted(false);
    setScreen("capture");
    setCameraError("");
    stopCamera();

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

    analysisRequestRef.current?.abort();
    const request = new AbortController();
    analysisRequestRef.current = request;
    setError("");
    setResult(null);
    setQuizChoice(null);
    setQuizSubmitted(false);
    setScreen("loading");

    const body = new FormData();
    body.append("image", file);
    const timeoutId = window.setTimeout(() => {
      request.timedOut = true;
      request.abort();
    }, 95_000);

    try {
      const response = await fetch(`${API_URL}/api/classify`, { method: "POST", body, signal: request.signal });
      const payload = await response.json().catch(() => null);
      if ((request.signal.aborted && !request.timedOut) || analysisRequestRef.current !== request) return;
      if (!response.ok) {
        throw new Error(payload?.message || "The image could not be classified right now.");
      }
      const normalizedPayload = normalizeClassification(payload);
      if (!normalizedPayload) {
        throw new Error("The service returned an invalid result. Please try again.");
      }
      setResult(normalizedPayload);
      setScreen("result");
    } catch (requestError) {
      if ((request.signal.aborted && !request.timedOut) || analysisRequestRef.current !== request) return;
      setError(request.timedOut ? "The AI service took too long to respond. Please try again." : requestError.message || "The network connection failed. Please try again.");
      setScreen("capture");
    } finally {
      window.clearTimeout(timeoutId);
      if (analysisRequestRef.current === request) analysisRequestRef.current = null;
    }
  }

  function resetScan() {
    analysisRequestRef.current?.abort();
    analysisRequestRef.current = null;
    setFile(null);
    setResult(null);
    setError("");
    setQuizChoice(null);
    setQuizSubmitted(false);
    turnCameraOn();
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setScreen("capture");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  function backToCamera() {
    analysisRequestRef.current?.abort();
    analysisRequestRef.current = null;
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
          cameraError={cameraError}
          cameraActive={cameraActive}
          cameraPaused={cameraPaused}
          cameraInputRef={cameraInputRef}
          uploadInputRef={uploadInputRef}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onFile={selectFile}
          onAnalyze={analyzeImage}
          onReset={resetScan}
          onStartCamera={turnCameraOn}
          onStopCamera={turnCameraOff}
          onCaptureFrame={captureFrame}
        />
      )}
      {screen === "loading" && <LoadingScreen previewUrl={previewUrl} onBack={backToCamera} />}
      {screen === "result" && (
        <ResultScreen
          result={result}
          previewUrl={previewUrl}
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

function normalizeClassification(payload) {
  if (!payload || typeof payload.itemName !== "string" || typeof payload.category !== "string") return null;
  const confidence = Number(payload.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1 || !Array.isArray(payload.cleaningSteps)) return null;
  if (![true, false, null].includes(payload.recyclable) && payload.recyclable !== "true" && payload.recyclable !== "false") return null;
  const recyclable = payload.recyclable === "true" ? true : payload.recyclable === "false" ? false : payload.recyclable;
  return {
    ...payload,
    itemName: payload.itemName.trim(),
    confidence,
    recyclable,
    cleaningSteps: payload.cleaningSteps.filter((step) => typeof step === "string").slice(0, 4),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    quiz: payload.quiz && typeof payload.quiz === "object" ? payload.quiz : null
  };
}

function CaptureScreen({ file, previewUrl, error, cameraError, cameraActive, cameraPaused, cameraInputRef, uploadInputRef, videoRef, canvasRef, onFile, onAnalyze, onReset, onStartCamera, onStopCamera, onCaptureFrame }) {
  const hasPreview = Boolean(file && previewUrl);

  return (
    <section className="capture-screen" aria-labelledby="page-title">
      <div className="capture-workspace">
        <aside className="capture-sidebar" aria-label="Scan controls">
          <a className="brand brand-light" href="/" aria-label="EcoScan AI home">
            <span className="brand-wordmark"><span>EcoScan</span> AI</span>
          </a>
          <div className="sidebar-heading">
            <p className="eyebrow">Waste sorting / 01</p>
            <h1 id="page-title">Scan an item</h1>
          </div>
          <nav className="capture-nav" aria-label="Capture method">
            <button className={`capture-nav-item ${cameraActive ? "is-active" : ""}`} type="button" onClick={cameraActive ? onStopCamera : onStartCamera} aria-pressed={cameraActive} aria-label={cameraActive ? "Turn camera off" : "Turn camera on"} title={cameraActive ? "Turn camera off" : "Turn camera on"}>
              <Camera size={22} aria-hidden="true" /><span>Camera</span>
            </button>
            <button className="capture-nav-item" type="button" onClick={() => uploadInputRef.current?.click()} aria-label="Upload an image">
              <ImagePlus size={22} aria-hidden="true" /><span>Upload image</span>
            </button>
          </nav>
          <p className="sidebar-footnote"><Info size={14} aria-hidden="true" /> AI guidance is based on the supplied Macau rules.</p>
        </aside>

        <section className="camera-card" aria-label="EcoScan camera">
          <div className="camera-stage">
            {hasPreview ? (
              <img className="camera-image" src={previewUrl} alt="Selected item preview" />
            ) : cameraActive ? (
              <video ref={videoRef} className="camera-image" autoPlay playsInline muted aria-label="Live camera preview" />
            ) : (
              <div className="camera-empty">
                <span className="camera-empty-icon" aria-hidden="true"><Camera size={25} strokeWidth={1.8} /></span>
                <strong>{cameraPaused ? "Camera is off" : "Ready when you are"}</strong>
                <span>{cameraPaused ? "Turn the camera on or choose a photo" : "Use your camera or choose a photo"}</span>
              </div>
            )}
            <span className="viewfinder viewfinder-tl" aria-hidden="true" />
            <span className="viewfinder viewfinder-tr" aria-hidden="true" />
            <span className="viewfinder viewfinder-bl" aria-hidden="true" />
            <span className="viewfinder viewfinder-br" aria-hidden="true" />
          </div>

          {(error || cameraError) && <div className="alert" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {error || cameraError}</div>}

          <CameraControls
            hasPreview={hasPreview}
            cameraActive={cameraActive}
            onUpload={() => uploadInputRef.current?.click()}
            onAnalyze={onAnalyze}
            onCaptureFrame={onCaptureFrame}
            onStartCamera={onStartCamera}
            onStopCamera={onStopCamera}
            onReset={onReset}
          />
          <input ref={cameraInputRef} className="visually-hidden" tabIndex={-1} aria-label="Take a photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => onFile(event.target.files?.[0])} />
          <input ref={uploadInputRef} className="visually-hidden" tabIndex={-1} aria-label="Upload image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} />
          <canvas ref={canvasRef} className="visually-hidden" aria-hidden="true" />
        </section>
      </div>
    </section>
  );
}

CaptureScreen.propTypes = {
  file: PropTypes.object,
  previewUrl: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired,
  cameraError: PropTypes.string.isRequired,
  cameraActive: PropTypes.bool.isRequired,
  cameraPaused: PropTypes.bool.isRequired,
  cameraInputRef: PropTypes.object.isRequired,
  uploadInputRef: PropTypes.object.isRequired,
  videoRef: PropTypes.object.isRequired,
  canvasRef: PropTypes.object.isRequired,
  onFile: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onStartCamera: PropTypes.func.isRequired,
  onStopCamera: PropTypes.func.isRequired,
  onCaptureFrame: PropTypes.func.isRequired
};

function LoadingScreen({ previewUrl, onBack }) {
  const stages = [
    { label: "Image check", state: "complete" },
    { label: "Item recognition", state: "active" },
    { label: "Local guidance", state: "pending" }
  ];
  return (
    <section className="loading-screen" aria-live="polite" aria-busy="true">
      <ScreenHeader onBack={onBack} label="Back to camera" compact />
      <div className="loading-card glass-panel">
        <div className="loading-preview-panel">
          {previewUrl ? <img className="loading-image" src={previewUrl} alt="Image being analyzed" /> : <div className="result-image-fallback"><Camera size={28} aria-hidden="true" /><span>Waiting for image</span></div>}
        </div>
        <div className="loading-content">
          <p className="eyebrow">Analysis / 02</p>
          <h1>Checking the evidence.</h1>
          <p>Analyzing your photo</p>
          <LoaderCircle className="loading-spinner" size={76} aria-hidden="true" />
          <div className="loading-steps" aria-label="Analysis progress">
            {stages.map((stage, index) => (
              <div className="loading-step" key={stage.label}>
                <span className={`loading-step-icon is-${stage.state}`} aria-hidden="true">
                  {stage.state === "complete" ? <Check size={15} /> : stage.state === "active" ? <LoaderCircle size={17} /> : <Circle size={16} />}
                </span>
                <span>{stage.label}</span>
                {index < stages.length - 1 && <span className="loading-step-line" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

LoadingScreen.propTypes = {
  previewUrl: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired
};

function ResultScreen({ result, previewUrl, quizChoice, quizSubmitted, onChoice, onSubmit, onBack, onReset }) {
  const [showDetails, setShowDetails] = useState(false);
  const detailsRef = useRef(null);
  useEffect(() => setShowDetails(false), [result]);
  useEffect(() => {
    if (showDetails) {
      detailsRef.current?.scrollIntoView({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
    }
  }, [showDetails]);
  if (!result) return null;
  const isLowConfidence = result.confidence < 0.65;
  const confidencePercent = Math.round(result.confidence * 100);
  const confidenceLabel = isLowConfidence ? "Low" : confidencePercent >= 0.85 * 100 ? "High" : "Medium";
  const decisionStatus = result.recyclable === null ? "Check local rules" : result.recyclable ? "Likely recyclable" : "Not recyclable";

  return (
    <section className="result-screen" aria-labelledby="result-title">
      <ScreenHeader onBack={onBack} label="Back to camera" centered />
      <div className="result-content">
        <div className="result-layout">
          <figure className="result-image-card">
            {previewUrl ? <img src={previewUrl} alt={`Uploaded item preview: ${result.itemName}`} /> : <div className="result-image-fallback"><Camera size={28} aria-hidden="true" /><span>No preview available</span></div>}
            <figcaption className="visually-hidden">Image used for this analysis</figcaption>
          </figure>

          <div className="result-panel">
            <p className="eyebrow">Analysis complete / 03</p>
            <h1 id="result-title">{result.itemName}</h1>
            <p className="result-category">Category: <span>{formatCategory(result.category)}</span></p>
            <div className={`decision-banner ${result.recyclable === null ? "is-unknown" : result.recyclable ? "is-recyclable" : "is-not-recyclable"}`}>
              <Recycle size={42} aria-hidden="true" />
              <div><strong>{decisionStatus}</strong><span>Check local collection rules</span></div>
            </div>
            <div className="confidence-callout confidence-row">
              <Info size={24} aria-hidden="true" />
              <div><strong>AI confidence: <span>{confidenceLabel}</span></strong><small>{confidencePercent}% estimate · not official certification</small><span className="confidence-track" role="meter" aria-label="AI confidence estimate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={confidencePercent}><span style={{ width: `${confidencePercent}%` }} /></span></div>
            </div>
            <div className="decision-trace-block">
              <h2>Decision trace</h2>
              <DecisionTrace result={result} />
            </div>
            <button className="more-info-button" type="button" aria-expanded={showDetails} aria-controls="result-details" onClick={() => setShowDetails((current) => !current)}>
              <ChevronDown className={showDetails ? "is-open" : ""} size={18} aria-hidden="true" /> {showDetails ? "Hide information" : "More information"}
            </button>
            <button className="scan-again-button" type="button" onClick={onReset}><Camera size={19} aria-hidden="true" /> Scan another item</button>
          </div>
        </div>

          <div id="result-details" ref={detailsRef} className="result-details" hidden={!showDetails}>
            <VisualGuide guide={result.visualGuide} />
            {result.disposalOptions?.length > 0 && (
              <article className="result-detail-card disposal-options-card">
                <div className="result-label">Disposal options</div>
                <ol className="disposal-list">
                  {result.disposalOptions.map((option) => (
                    <li className="disposal-option" key={option.title}>
                      <strong>{option.title}</strong>
                      {option.guidance && <p className="result-copy">{option.guidance}</p>}
                      {option.precautions?.length > 0 && (
                        <ul className="disposal-precautions">
                          {option.precautions.map((step) => <li key={step}>{step}</li>)}
                        </ul>
                      )}
                      {option.location && <p className="disposal-location"><strong>Where:</strong> {option.location}</p>}
                      {option.source && (
                        <a className="disposal-source" href={option.source.url} target="_blank" rel="noreferrer">
                          {option.source.name} <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            )}
            <article className="result-detail-card">
              <div className="result-label">Cleaning protocol</div>
              {result.cleaningSteps.length ? <ol className="steps-list">{result.cleaningSteps.map((step) => <li key={step}>{step}</li>)}</ol> : <p className="muted-copy">No cleaning steps were returned.</p>}
            </article>
            <article className="result-detail-card learning-result-card">
              <div className="result-label"><Leaf size={15} aria-hidden="true" /> Learning signal</div>
              <p className="result-copy">{result.learningFact || "The AI did not return a learning fact."}</p>
              {result.safetyNote && <p className="safety-note"><strong>Safety:</strong> {result.safetyNote}</p>}
              {result.sources?.length > 0 && <div className="sources-block"><div className="result-label">Sources</div>{result.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={13} aria-hidden="true" /></a>)}</div>}
            </article>
            {result.quiz && <Quiz quiz={result.quiz} choice={quizChoice} submitted={quizSubmitted} onChoice={onChoice} onSubmit={onSubmit} />}
          </div>
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
    visualGuide: PropTypes.shape({ status: PropTypes.string.isRequired, scanId: PropTypes.string, message: PropTypes.string }),
    reason: PropTypes.string,
    cleaningSteps: PropTypes.arrayOf(PropTypes.string).isRequired,
    disposalOptions: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        guidance: PropTypes.string,
        precautions: PropTypes.arrayOf(PropTypes.string),
        location: PropTypes.string,
        source: PropTypes.shape({ name: PropTypes.string, url: PropTypes.string })
      })
    ),
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
  previewUrl: PropTypes.string.isRequired,
  quizChoice: PropTypes.number,
  quizSubmitted: PropTypes.bool.isRequired,
  onChoice: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired
};

function DecisionTrace({ result }) {
  const localRulesState = result.sourceNeeded ? "warning" : "complete";
  return (
    <div className="decision-trace-list">
      <div className="decision-trace-item"><span className="trace-icon is-complete"><CheckCircle2 size={18} aria-hidden="true" /></span><div><strong>Item identified</strong><span>Recognised as {result.itemName.toLowerCase()}</span></div></div>
      <div className="decision-trace-item"><span className="trace-icon is-complete"><CheckCircle2 size={18} aria-hidden="true" /></span><div><strong>Material estimated</strong><span>Estimated material: {formatCategory(result.category)}</span></div></div>
      <div className="decision-trace-item"><span className={`trace-icon is-${localRulesState}`}>{localRulesState === "complete" ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}</span><div><strong>{result.sourceNeeded ? "Local rules need checking" : "Local guidance matched"}</strong><span>{result.sourceNeeded ? "Recycling rules vary by location." : "The supplied guidance was used."}</span></div></div>
    </div>
  );
}

DecisionTrace.propTypes = {
  result: PropTypes.shape({
    itemName: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    sourceNeeded: PropTypes.bool
  }).isRequired
};

function ScreenHeader({ onBack, label, centered = false, compact = false }) {
  return (
    <header className={`screen-header ${centered ? "is-centered" : ""} ${compact ? "is-compact" : ""}`}>
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> {label}</button>
      <span className="screen-header-brand"><span>EcoScan</span> AI</span>
      <UserRound className="screen-header-profile" size={19} aria-hidden="true" />
    </header>
  );
}

ScreenHeader.propTypes = {
  onBack: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  centered: PropTypes.bool,
  compact: PropTypes.bool
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
