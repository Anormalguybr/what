# EcoScan AI

EcoScan AI is a browser-based learning tool for waste sorting. A user can take a photo or upload an image, then receive an AI-assisted item identification, a cautious recycling category, English cleaning guidance, and a short learning question.

The project is designed for the Macau student competition. It keeps the AI key on the Node.js server and treats Macau recycling guidance as the local source of truth. The current local rules file is a small starter dataset and must be checked against current official Macau guidance before public release.

## Project structure

```text
client/    React + Vite browser application
server/    Node.js + Express API and DeepSeek integration
docs/      Architecture, data sources, testing, and AI disclosure
```

## Local setup

Requirements: Node.js 18.11 or newer and npm 9 or newer. Node 20 or newer is recommended for Windows.

```bash
cp .env.example server/.env
npm --prefix server install
npm --prefix client install
```

The server can run without a key. In that state it returns a clear `AI_NOT_CONFIGURED` error instead of pretending to classify an image.

```bash
npm --prefix server run dev
npm --prefix client run dev
```

Open <http://localhost:5173>. The capture screen requests a live camera preview with `getUserMedia`; after the shutter is pressed, the current video frame becomes the image sent for analysis. The Camera toggle turns the live preview off and on: switching it off immediately stops the camera tracks so the device is released, and shows a "Camera is off" prompt until it is switched back on or an image is uploaded. Camera access requires HTTPS on phones (localhost is also allowed by browsers). The upload control remains the fallback when a LAN URL is not served over HTTPS or permission is denied.

### Windows PowerShell

The web app runs on Windows 10 or 11 with Node.js 18.11 or newer. In PowerShell, the equivalent setup is:

```powershell
Copy-Item .env.example server/.env
Push-Location server; npm install; Pop-Location
Push-Location client; npm install; Pop-Location
```

Open two PowerShell windows and run one command in each:

```powershell
Push-Location server; npm run dev
```

```powershell
Push-Location client; npm run dev
```

Use Chrome or Microsoft Edge for camera and file upload. Windows browsers can always use the upload control; camera capture may require HTTPS and a granted browser camera permission when deployed.

## Environment variables

Copy `.env.example` to `server/.env` or load the variables in the server process. `DEEPSEEK_API_KEY` must never be exposed to the client or committed to Git.

The server uses the OpenAI-compatible DeepSeek endpoint and the configured `DEEPSEEK_MODEL`. Confirm the account's current model name, image support, limits, and pricing against the official provider documentation before deployment.

### Educational illustrations

Add the following values to `server/.env` (never to the client). Keep the existing DeepSeek settings for classification and English prompt planning:

```dotenv
IMAGE_API_KEY=
IMAGE_MODEL=gemini-3.1-flash-lite-image
IMAGE_BASE_URL=https://api.relayrouter.ai/v1
```

Set `IMAGE_API_KEY` to a RelayRouter key with permission for this model, then restart the backend. `/api/health` reports `visualGuideConfigured` without exposing either key. The endpoint uses the OpenAI-compatible chat completion format, not the OpenAI image-generation endpoint. Provider reference: <https://doc.relayrouter.ai/en/reference/v1?op=post-v1-chat-completions&leaf=275101024>.

The result page adds a Material notebook section inside More information with a Japanese anime-inspired educational illustration and English parts/material labels. It is hidden until the user expands More information; generation continues in the background and is not restarted by toggling the section. The backend skips `unknown`, confidence below 0.65, null recycling decisions, organic and general waste results. Plastic, paper, metal and glass can receive a simplified anatomy guide. Electronics receive only an intact-exterior safety and collection illustration. DeepSeek may also veto an illustration if the evidence is insufficient.

The image model receives a text prompt, not the uploaded photograph. Exact polymer types, hidden layers, chemical composition and manufacturing details are not verified. Illustrations and material labels must be reviewed before using them as teaching facts. Classification remains usable if the image service is unconfigured, busy, slow, or fails. No image retry is automatic, to avoid repeated charges.

## API

`POST /api/classify` accepts `multipart/form-data` with one field named `image`. Supported types are JPEG, PNG, and WebP. The response is a fixed JSON object containing the item name, category, confidence, reason, cleaning steps, disposal options, learning fact, safety note, sources, and quiz data. When an item has more than one official Macau channel (for example, batteries), the `disposalOptions` array lists each channel with its preparation steps, location, and source. The server drops any option whose source is not in the supplied source list, so a channel or location cannot be invented.

`GET /api/health` reports whether the server is running and whether the AI key is configured. It does not reveal the key.

`POST /api/visual-guide` accepts JSON `{ "scanId": "..." }` using the server-issued reference in `/api/classify`'s `visualGuide` field. Client-provided prompts and classification data are not accepted. Responses use `ready`, `skipped`, `failed`, or `unavailable`; `ready` includes `title`, an inline `imageUrl`, `parts`, and a disclaimer. Results are shared for repeated requests for the same scan and expire after ten minutes. The store is bounded to 16 scans and two active generation jobs per server process. It is an in-memory prototype cache, not a distributed or authenticated production service.

Generated images must be inline PNG, JPEG or WebP of at most 8 MB. Remote image URLs and SVG are rejected. A provider group returning hosted URLs will require a separately reviewed adapter. A successful live bottle smoke test is recorded in `docs/testing.md`; model availability depends on the configured provider, and wider diagram accuracy remains unverified.

## Verification

```bash
npm --prefix server test
npm --prefix server run lint
npm --prefix client test
npm --prefix client run lint
npm --prefix client run build
```

The current test suite covers request validation, image signatures, response normalization, source filtering, retry behavior, and the unconfigured-key path. A live AI test requires a real server-side key and an approved anonymous test image; no live result is claimed until that test is run.

## Privacy and limitations

Images are processed in memory and are not intentionally stored by this application. An image may be sent to the configured third-party AI provider for analysis. Do not upload faces, names, student numbers, or other sensitive data.

Classification metadata and educational illustrations are cached temporarily in server memory; uploaded photos are not cached for illustration generation. The visual-guide cache is cleared on a backend restart. The DeepSeek text-planning request and RelayRouter drawing request receive only the classification description needed for the guide.

AI results are suggestions, not absolute decisions. If the model is uncertain or the local rule does not match, the API returns `unknown` and asks the user to check current local guidance. The project does not display unsupported carbon-saving numbers.

## Team roles

- Frontend: camera/upload flow, preview, result states, quiz, and responsive UI.
- Backend and AI: Express API, file validation, DeepSeek integration, prompt, response validation, and deployment.
- Data, education, and documents: Macau source checking, learning content, testing records, README, report, poster, and demo script.

## Deployment

The React client can be deployed as a static site and the Node.js server must be deployed on a service that supports server-side environment variables. Set `CLIENT_ORIGIN` to the exact frontend origin and configure `DEEPSEEK_API_KEY` only on the server. Use HTTPS for camera access.
