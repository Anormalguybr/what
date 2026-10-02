# EcoScan AI Architecture

## Request flow

1. The React client accepts a JPEG, PNG, or WebP image and shows a local preview.
2. The client sends the image as `multipart/form-data` to `POST /api/classify`.
3. Express validates the file type and size in memory. The image is not written to disk.
4. The server sends the image and the current starter rules to the configured DeepSeek vision model.
5. The server validates the returned JSON against the EcoScan response contract.
6. The client renders the classification, uncertainty, cleaning guidance, learning fact, sources, and quiz.

## Responsibility boundaries

- React handles user interaction, preview, loading, error, result, and quiz states.
- Express handles validation, CORS, secrets, provider errors, and response normalization.
- DeepSeek identifies the visible object and writes English explanations.
- The Macau rules data is the intended local policy source. It must be reviewed against current official Macau guidance before public use.

## Provider and search policy

The server uses an OpenAI-compatible DeepSeek endpoint configured by environment variables. It must not expose the key to the browser. A future web retrieval feature should search an allowlist of official Macau sources and pass the retrieved text to the model; unrestricted web search is not treated as authoritative.

## Privacy

Images are kept in memory for the request and are not intentionally persisted by this application. The configured AI provider may receive the image. Test images must be anonymous and must not contain faces, names, student numbers, or other sensitive information.

## Cross-platform browser support

The client is a standard React/Vite web application and does not depend on macOS APIs. Windows 10 and 11 users can run the same Node.js scripts in PowerShell and use Chrome or Microsoft Edge. The camera control uses the browser file input with `capture="environment"`; browsers may ignore that hint on desktop, so the upload control remains the reliable fallback. Deployed camera use requires HTTPS and camera permission.
