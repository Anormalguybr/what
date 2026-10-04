# EcoScan AI Architecture

## Request flow

1. The React client tries to start a live camera stream on entry, subject to browser permissions and HTTPS. A canvas captures one video frame; the user can also use the upload fallback.
2. The client shows the selected frame locally and sends it as `multipart/form-data` to `POST /api/classify` after the loading screen begins.
3. Express validates the file type and size in memory. The image is not written to disk.
4. The server sends the image and the current starter rules to the configured DeepSeek vision model.
5. The server validates the returned JSON against the EcoScan response contract.
6. The client renders the classification, uncertainty, disposal options, cleaning guidance, learning fact, sources, and quiz.

## Educational image flow

1. `decideVisualGuide` gates the already validated classification. Only supported categories with confidence at least 0.65 and a non-null recycling decision are eligible; recycling eligibility alone does not decide image eligibility.
2. `/api/classify` returns `visualGuide.status` and an opaque `scanId` for eligible, configured scans. Photos are not retained in this cache.
3. The independent React `VisualGuide` component requests `POST /api/visual-guide` after the sorting result is visible. Returning to the camera aborts the browser request and ignores late responses.
4. The backend accepts only a registered scan reference. It shares one generation promise and cached response across duplicate requests, including React StrictMode remounts.
5. DeepSeek writes a validated English JSON plan (`title`, `prompt`, `parts`) or vetoes generation. Prompt constraints forbid unsupported composition figures and unsafe electronics disassembly.
6. RelayRouter receives the text-only plan at `/v1/chat/completions` with `gemini-3.1-flash-lite-image`. The image parser accepts inline bitmap responses with valid signatures and rejects hosted URLs/SVG. No automatic second image request is made after an error.
7. The result UI displays the image, English numbered legend and AI disclosure at the start of More information. This section is collapsed by default. Generation runs independently in the background, and toggling the section keeps the same image component mounted so it does not send another generation request. Expanding scrolls to the details section.

The generation request has a shared 90-second deadline and the browser waits up to 95 seconds. The in-memory cache expires scan references after ten minutes, prunes on access, caps stored entries at 16 and concurrent jobs at two. This bounds prototype resource usage but does not provide public-service authentication or rate limits. A deployment with multiple Node workers needs a shared job store.

## Responsibility boundaries

- React handles user interaction, preview, loading, error, result, and quiz states.
- Express handles validation, CORS, secrets, provider errors, and response normalization.
- DeepSeek identifies the visible object and writes English explanations.
- The Macau rules data is the intended local policy source. It must be reviewed against current official Macau guidance before public use.

## Guidance data and the multi-option contract

The local guidance file `server/data/macau-recycling-rules.json` is a curated, source-cited knowledge base. Each source has an id, name, url and access date. Each rule may carry an `options` array for items that have more than one official channel in Macau.

Batteries are the first such item. The `electronic` rule lists the real Macau channels: small batteries to DSPA collection boxes, rechargeable batteries and power banks with taped contacts, chargers to the Electronic and Electrical Equipment Recycling Programme, large batteries to mobile collection points or the pretreatment workshop, and large quantities by prior arrangement with the DSPA.

The AI response contract includes `disposalOptions`, an array of `{ title, guidance, precautions, location, source }`. The server validates every option and drops any option whose source is not in the supplied source list, so the model cannot invent a channel or a location. This is a curated approach: it needs no runtime web fetch, works offline, and stays explainable.

## Provider and search policy

The server uses an OpenAI-compatible DeepSeek endpoint configured by environment variables. It must not expose the key to the browser. A future web retrieval feature should search an allowlist of official Macau sources and pass the retrieved text to the model; unrestricted web search is not treated as authoritative.

## Privacy

Images are kept in memory for the request and are not intentionally persisted by this application. The configured AI provider may receive the image. Test images must be anonymous and must not contain faces, names, student numbers, or other sensitive information.

## Cross-platform browser support

The client is a standard React/Vite web application and does not depend on macOS APIs. Windows 10 and 11 users can run the same Node.js scripts in PowerShell with Node.js 18.11+ and npm 9+, then use Chrome or Microsoft Edge. The capture screen uses `navigator.mediaDevices.getUserMedia` for a live preview and a canvas frame capture; upload remains the reliable fallback. Phone camera access requires HTTPS, except for localhost browser development, and requires user permission.
