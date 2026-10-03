import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Leaf,
  LoaderCircle,
  Recycle,
  RefreshCcw
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const analysisRequestRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (screen !== "capture") stopCamera();
  }, [screen]);

  useEffect(() => () => stopCamera(), []);

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

    try {
      const response = await fetch(`${API_URL}/api/classify`, { method: "POST", body, signal: request.signal });
      const payload = await response.json().catch(() => null);
      if (request.signal.aborted || analysisRequestRef.current !== request) return;
      if (!response.ok) {
        throw new Error(payload?.message || "The image could not be classified right now.");
      }
      if (!payload || typeof payload.itemName !== "string" ||
          typeof payload.category !== "string" || !Number.isFinite(payload.confidence) ||
          payload.confidence < 0 || payload.confidence > 1 ||
          !Array.isArray(payload.cleaningSteps) ||
          ![true, false, null].includes(payload.recyclable)) {
        throw new Error("The service returned an invalid result. Please try again.");
      }
      setResult(payload);
      setScreen("result");
    } catch (requestError) {
      if (request.signal.aborted || analysisRequestRef.current !== request) return;
      setError(requestError.message || "The network connection failed. Please try again.");
      setScreen("capture");
    } finally {
      if (analysisRequestRef.current === request) analysisRequestRef.current = null;
    }
  }

  async function startCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera preview is unavailable in this browser. Use Upload image instead.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (cameraRequestError) {
      const message = cameraRequestError.name === "NotAllowedError"
        ? "Camera permission was denied. Use Upload image or allow camera access."
        : "Live camera preview needs HTTPS and camera permission. Use Upload image instead.";
      setCameraError(message);
      setCameraActive(false);
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
      setCameraError("The camera is still warming up. Please try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("The photo could not be captured. Please use Upload image.");
        return;
      }
      const capturedFile = new File([blob], `ecoscan-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      selectFile(capturedFile);
    }, "image/jpeg", 0.9);
  }

  function resetScan() {
    analysisRequestRef.current?.abort();
    analysisRequestRef.current = null;
    setFile(null);
    setResult(null);
    setError("");
    setQuizChoice(null);
    setQuizSubmitted(false);
    setCameraError("");
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
          cameraInputRef={cameraInputRef}
          uploadInputRef={uploadInputRef}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onFile={selectFile}
          onAnalyze={analyzeImage}
          onReset={resetScan}
          onStartCamera={startCamera}
          onCaptureFrame={captureFrame}
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

function CaptureScreen({ file, previewUrl, error, cameraError, cameraActive, cameraInputRef, uploadInputRef, videoRef, canvasRef, onFile, onAnalyze, onReset, onStartCamera, onCaptureFrame }) {
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
        </div>

        <section className="camera-card" aria-label="EcoScan camera">
          <div className="camera-card-header">
            <div>
              <p className="camera-kicker">Live preview</p>
              <p className="camera-subtitle">{hasPreview ? "Ready to analyze" : cameraActive ? "Live camera preview" : "Center the item in frame"}</p>
            </div>
            <span className="lens-pill">AI / local rules</span>
          </div>

          <div className="camera-stage">
            {hasPreview ? (
              <img className="camera-image" src={previewUrl} alt="Selected item preview" />
            ) : cameraActive ? (
              <video ref={videoRef} className="camera-image" autoPlay playsInline muted aria-label="Live camera preview" />
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

          {(error || cameraError) && <div className="alert" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {error || cameraError}</div>}

          <div className="camera-controls">
            <button className="round-control" type="button" onClick={() => uploadInputRef.current?.click()} aria-label="Upload an image">
              <ImagePlus size={19} aria-hidden="true" />
            </button>
            <button className={`shutter-control ${hasPreview ? "shutter-ready" : ""}`} type="button" onClick={hasPreview ? onAnalyze : cameraActive ? onCaptureFrame : onStartCamera} aria-label={hasPreview ? "Analyze selected item" : cameraActive ? "Capture photo" : "Start live camera"}>
              {hasPreview ? <ArrowUpRight size={25} aria-hidden="true" /> : <Camera size={25} aria-hidden="true" />}
            </button>
            <button className="round-control" type="button" onClick={hasPreview ? onReset : onStartCamera} aria-label={hasPreview ? "Choose another image" : "Start live camera"}>
              {hasPreview ? <RefreshCcw size={19} aria-hidden="true" /> : <Camera size={19} aria-hidden="true" />}
            </button>
            <input ref={cameraInputRef} className="visually-hidden" tabIndex={-1} aria-label="Take a photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => onFile(event.target.files?.[0])} />
            <input ref={uploadInputRef} className="visually-hidden" tabIndex={-1} aria-label="Upload image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} />
            <canvas ref={canvasRef} className="visually-hidden" aria-hidden="true" />
          </div>
          <p className="shutter-label">{hasPreview ? "Analyze item" : cameraActive ? "Tap to capture" : "Start camera"}</p>
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
  cameraError: PropTypes.string.isRequired,
  cameraActive: PropTypes.bool.isRequired,
  cameraInputRef: PropTypes.object.isRequired,
  uploadInputRef: PropTypes.object.isRequired,
  videoRef: PropTypes.object.isRequired,
  canvasRef: PropTypes.object.isRequired,
  onFile: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onStartCamera: PropTypes.func.isRequired,
  onCaptureFrame: PropTypes.func.isRequired
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
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => setShowDetails(false), [result]);
  if (!result) return null;
  const isLowConfidence = result.confidence < 0.65;
  const confidencePercent = Math.round(result.confidence * 100);

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

        <div className="result-overview result-summary-only">
          <article className="result-hero-card">
            <div className="result-label">Recommended sort</div>
            <div className="result-sort-row">
              <span className={`category-badge category-${result.category}`}>{formatCategory(result.category)}</span>
              <span className={`recycle-status ${result.recyclable === null ? "is-unknown" : result.recyclable ? "is-recyclable" : "is-not-recyclable"}`}>
                {result.recyclable === null ? "Check locally" : result.recyclable ? "Recyclable" : "Not recyclable"}
              </span>
            </div>
            <div className="confidence-row" title="The model's confidence estimate, not measured accuracy.">
              <span>{confidencePercent}% AI confidence</span>
              <span className="confidence-track" role="meter" aria-label="AI confidence estimate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={confidencePercent}>
                <span style={{ width: `${confidencePercent}%` }} />
              </span>
            </div>
            {(isLowConfidence || result.category === "unknown" || result.sourceNeeded) && <p className="notice-text">Use this as a learning aid and check the current local collection rule before disposal.</p>}
            <div className="summary-trace">
              <div className="result-label">Decision trace</div>
              <p className="result-copy">{result.reason || "No explanation was returned."}</p>
            </div>
            <button className="more-info-button" type="button" aria-expanded={showDetails} aria-controls="result-details" onClick={() => setShowDetails((current) => !current)}>
              {showDetails ? "Hide information" : "More information"} <ChevronDown className={showDetails ? "is-open" : ""} size={16} aria-hidden="true" />
            </button>
          </article>
        </div>

          <div id="result-details" className="result-details" hidden={!showDetails}>
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
