/* eslint-disable react-refresh/only-export-components -- this file intentionally groups the camera hook with its controls */
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ArrowUpRight, Camera, CameraOff, ImagePlus, RefreshCcw } from "lucide-react";

const CAMERA_UNAVAILABLE_MESSAGE = "Live camera preview is unavailable in this browser. Use Upload image instead.";
const CAMERA_DENIED_MESSAGE = "Camera permission was denied or this page is not using HTTPS. Use Upload image or allow camera access.";
const CAMERA_FALLBACK_MESSAGE = "Live camera preview needs HTTPS and camera permission. Use Upload image instead.";

// Camera on/off logic. It owns the media stream and exposes explicit turn-on/turn-off
// controls, so the live preview can always be released on request.
export function useCamera({ screen, hasImage, videoRef, canvasRef, onCapture }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const cameraStreamRef = useRef(null);
  const cameraStartRef = useRef(null);
  const cameraRequestIdRef = useRef(0);

  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(CAMERA_UNAVAILABLE_MESSAGE);
      return;
    }

    stopCamera();
    const requestId = ++cameraRequestIdRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (cameraRequestError) {
      const message = cameraRequestError.name === "NotAllowedError" || cameraRequestError.name === "SecurityError"
        ? CAMERA_DENIED_MESSAGE
        : CAMERA_FALLBACK_MESSAGE;
      setCameraError(message);
      setCameraActive(false);
    }
  }, [stopCamera, videoRef]);

  useEffect(() => {
    if (screen === "capture" && !hasImage && !cameraActive && !cameraPaused && !cameraError && !cameraStartRef.current) {
      cameraStartRef.current = startCamera().finally(() => {
        cameraStartRef.current = null;
      });
    }
  }, [screen, hasImage, cameraActive, cameraPaused, cameraError, startCamera]);

  useEffect(() => {
    if (screen !== "capture") stopCamera();
  }, [screen, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function turnCameraOn() {
    setCameraPaused(false);
    setCameraError("");
  }

  function turnCameraOff() {
    setCameraPaused(true);
    stopCamera();
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
      onCapture(capturedFile);
    }, "image/jpeg", 0.9);
  }

  return {
    cameraActive,
    cameraPaused,
    cameraError,
    setCameraError,
    startCamera,
    stopCamera,
    turnCameraOn,
    turnCameraOff,
    captureFrame
  };
}

// Every lower-bar control is a press button: a short bounce plus a radial ripple
// gives clear touch/click feedback without changing the control's function.
function PressButton({ className, ariaLabel, onClick, disabled = false, children }) {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);

  return (
    <button
      className={`press-button ${className}${pressed ? " is-pressed" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onBlur={release}
    >
      <span className="press-ripple" aria-hidden="true" />
      {children}
    </button>
  );
}

PressButton.propTypes = {
  className: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node
};

export function CameraControls({ hasPreview, cameraActive, onUpload, onAnalyze, onCaptureFrame, onStartCamera, onStopCamera, onReset }) {
  return (
    <div className="camera-controls glass-control-bar">
      <PressButton className="round-control" ariaLabel="Upload an image" onClick={onUpload}>
        <ImagePlus size={24} aria-hidden="true" /><span>Upload image</span>
      </PressButton>
      <PressButton
        className={`shutter-control ${hasPreview ? "shutter-ready" : ""}`}
        ariaLabel={hasPreview ? "Analyze selected item" : cameraActive ? "Capture photo" : "Start live camera"}
        onClick={hasPreview ? onAnalyze : cameraActive ? onCaptureFrame : onStartCamera}
      >
        <span className="shutter-disc">{hasPreview ? <ArrowUpRight size={25} aria-hidden="true" /> : <Camera size={25} aria-hidden="true" />}</span>
        <span>{hasPreview ? "Analyze" : "Capture"}</span>
      </PressButton>
      {hasPreview ? (
        <PressButton className="round-control" ariaLabel="Choose another image" onClick={onReset}>
          <RefreshCcw size={24} aria-hidden="true" /><span>Retake</span>
        </PressButton>
      ) : cameraActive ? (
        <PressButton className="round-control" ariaLabel="Turn camera off" onClick={onStopCamera}>
          <CameraOff size={24} aria-hidden="true" /><span>Camera off</span>
        </PressButton>
      ) : (
        <PressButton className="round-control" ariaLabel="Turn camera on" onClick={onStartCamera}>
          <Camera size={24} aria-hidden="true" /><span>Camera on</span>
        </PressButton>
      )}
    </div>
  );
}

CameraControls.propTypes = {
  hasPreview: PropTypes.bool.isRequired,
  cameraActive: PropTypes.bool.isRequired,
  onUpload: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
  onCaptureFrame: PropTypes.func.isRequired,
  onStartCamera: PropTypes.func.isRequired,
  onStopCamera: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired
};
