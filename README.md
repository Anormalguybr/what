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

Requirements: Node.js 18 or newer and npm.

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

Open <http://localhost:5173>. Camera capture requires HTTPS in a deployed environment; local development can use the upload control.

### Windows PowerShell

The web app runs on Windows 10 or 11 with Node.js 18 or newer. In PowerShell, the equivalent setup is:

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

## API

`POST /api/classify` accepts `multipart/form-data` with one field named `image`. Supported types are JPEG, PNG, and WebP. The response is a fixed JSON object containing the item name, category, confidence, reason, cleaning steps, learning fact, safety note, sources, and quiz data.

`GET /api/health` reports whether the server is running and whether the AI key is configured. It does not reveal the key.

## Verification

```bash
npm --prefix server test
npm --prefix server run lint
npm --prefix client run lint
npm --prefix client run build
```

The current test suite covers request validation, image signatures, response normalization, source filtering, retry behavior, and the unconfigured-key path. A live AI test requires a real server-side key and an approved anonymous test image; no live result is claimed until that test is run.

## Privacy and limitations

Images are processed in memory and are not intentionally stored by this application. An image may be sent to the configured third-party AI provider for analysis. Do not upload faces, names, student numbers, or other sensitive data.

AI results are suggestions, not absolute decisions. If the model is uncertain or the local rule does not match, the API returns `unknown` and asks the user to check current local guidance. The project does not display unsupported carbon-saving numbers.

## Team roles

- Frontend: camera/upload flow, preview, result states, quiz, and responsive UI.
- Backend and AI: Express API, file validation, DeepSeek integration, prompt, response validation, and deployment.
- Data, education, and documents: Macau source checking, learning content, testing records, README, report, poster, and demo script.

## Deployment

The React client can be deployed as a static site and the Node.js server must be deployed on a service that supports server-side environment variables. Set `CLIENT_ORIGIN` to the exact frontend origin and configure `DEEPSEEK_API_KEY` only on the server. Use HTTPS for camera access.
