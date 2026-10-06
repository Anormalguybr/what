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

`POST /api/classify` accepts `multipart/form-data` with one field named `image`. Supported types are JPEG, PNG, and WebP. The response is a fixed JSON object containing the item name, category, confidence, reason, cleaning steps, disposal options, a suggested Macau collection bin, learning fact, safety note, sources, and quiz data. The `suggestedBin` object names the official Macau container for the category (for example the public three-colour recycling bin for plastic bottles, cans and paper, a public glass bottle bin, or a waste battery box) with a source link. It is a curated lookup in `server/src/suggested-bin.js`, not an AI invention. When DSPA publishes a photo of that bin, the response also carries an `image` path served from `/api/bin-images/...`, plus the DSPA attribution and the date the photo was obtained. When an item has more than one official Macau channel (for example, batteries), the `disposalOptions` array lists each channel with its preparation steps, location, and source. The server drops any option whose source is not in the supplied source list, so a channel or location cannot be invented.

The system prompt identifies the item first (a short, specific `itemName` and the dominant material) and only then applies the supplied Macau guidance. A recognizable everyday item keeps its material category even if it is slightly dirty, with the cleaning requirement in `cleaningSteps`, while genuinely unclear or mixed-material images return `unknown`. This keeps the answer both faster and more useful than the previous decision-first wording, without weakening the no-invention rules. See `docs/ai-disclosure.md` for the measured before/after.

`GET /api/health` reports whether the server is running and whether the AI key is configured. It does not reveal the key.

`POST /api/visual-guide` accepts JSON `{ "scanId": "..." }` using the server-issued reference in `/api/classify`'s `visualGuide` field. Client-provided prompts and classification data are not accepted. Responses use `ready`, `skipped`, `failed`, or `unavailable`; `ready` includes `title`, an inline `imageUrl`, `parts`, and a disclaimer. Results are shared for repeated requests for the same scan and expire after ten minutes. The store is bounded to 16 scans and two active generation jobs per server process. It is an in-memory prototype cache, not a distributed or authenticated production service.

Generated images must be inline PNG, JPEG or WebP of at most 8 MB. Remote image URLs and SVG are rejected. A provider group returning hosted URLs will require a separately reviewed adapter. A successful live bottle smoke test is recorded in `docs/testing.md`; model availability depends on the configured provider, and wider diagram accuracy remains unverified.

## Recycling point finder

The capture sidebar, the camera control bar, and the result page for recyclable categories open a drop-off finder built from the official DSPA point lists. It covers Eco Fun stations, the mobile recycling truck, street stations and service points, clothing, glass bottles, light tubes and bulbs, electronics (fixed and mobile), and batteries.

`GET /api/recycling-points` returns the channel summaries: id, name, accepted streams, point count, count-with-coordinates, region counts, official source link and capture date. `GET /api/recycling-points/:channelId` returns the points for one channel and accepts `region` (`macau`, `taipa`, `coloane`), `q` (free-text search over name and address), and `limit`/`offset` for paging. Every point keeps the source id it came from, and points that DSPA publishes with a map link show a Map button. Both endpoints send `Cache-Control: no-store`.

`GET /api/recycling-points/nearby?lat=<latitude>&lng=<longitude>&limit=<n>&category=<scan category>` returns the closest drop-off points to a position, ranked by straight-line (Haversine) distance. Passing `category` (one of the classifier's categories) keeps only points whose channel accepts that material, so a suggestion is never a place that does not take the scanned item; a category with no recycling stream (`general_waste`, `unknown`, `organic`) returns no points. Invalid coordinates or an unknown category return `400`. The client asks the browser for the user's position with `navigator.geolocation` when the **Nearest to me** button is pressed, and automatically after a scan on the result page's **Where to take it** panel. Browser location permission is required, and on phones geolocation needs HTTPS (localhost is also allowed).

Only the Eco Fun network (stations, mobile truck, street stations, service points and community points) publishes official coordinates, through the DSPA `ecofunweb/read_time.aspx?station=ALL` endpoint. The other channels publish an address only, so they are listed without distances and are excluded from the nearest-point search. The Eco Fun network accepts paper, plastic, metal, glass and small electronics (including batteries), so every recyclable scan category can still be matched to a nearby point. The response includes a `coordinateNote` that the UI shows, so this limitation is visible to the user.

The point list is a committed snapshot in `server/data/macau-recycling-points.json`, generated from the DSPA website by `server/scripts/import-recycling-points.mjs`. Refresh it when the source pages change:

```bash
npm --prefix server run import:points
```

Point lists change over time, so the finder shows the capture date and links each channel to the official DSPA page. It is a snapshot, not a live feed, and it does not claim that a point will accept a specific item.

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
