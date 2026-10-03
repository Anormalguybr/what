# EcoScan AI — Research Report

**Competition:** 2026 Global Youth AI Future Innovation Competition, Macau Secondary School Division
**Category:** AI for Social Innovation
**Team:** [Team members: names] · **School:** [School name] · **Date:** [Submission date]
**Repository:** https://github.com/Anormalguybr/what

> This report describes only work that has been performed. Where a step is not yet complete, it is explicitly marked **Pending**. No test result, user count, accuracy figure, or environmental number has been invented.

---

## 1. Background

Waste sorting is one of the most visible ways a student can act on sustainability, but it is surprisingly easy to get wrong. Recycling systems depend on material and condition: clean, dry paper is recyclable, while a greasy food box is not; a rinsed can belongs with metal, while a food-soiled container may contaminate the stream. Because the rules differ by city, students cannot simply copy general advice from the internet — they need the rules that apply where they live.

Macau is a dense city where municipal waste management is a real and visible challenge. Official guidance exists, but it is not always in the exact form a student needs at the moment of throwing something away: a fast, visual, English explanation that also teaches the reason behind the rule. This gap between information and everyday action is the starting point for EcoScan AI.

The project also responds to the 2026 competition theme, *"AI and Education: AI Transforming the Educational Paradigm and Enhancing AI Literacy"*. EcoScan AI is not only a sorting aid; it is a tool for learning how to think about materials, rules, and the cautious use of an AI system.

## 2. Problem definition

The core problem is a decision problem with an education gap:

1. **Local specificity.** Correct recycling depends on Macau's current collection guidance, not on generic global rules.
2. **Condition matters.** The same material can be recyclable or not, depending on whether it is clean, dry, and free of food residue.
3. **Invisible consequences.** Students rarely see why a mistake matters, so the behaviour does not improve.
4. **Access and language.** A student holding a phone needs an answer in seconds, in clear English, without reading a long document.

**Research question:** Can a real vision AI model, guided by a carefully designed prompt and a small, cited Macau rules dataset, give students a fast, cautious, and *explainable* sorting suggestion that also teaches the reason behind it?

**Design constraint:** when the evidence is weak, the system must be honest and say `unknown` rather than output a confident wrong answer.

## 3. Target users

- **Primary:** secondary school students in Macau (ages roughly 12–18) learning about waste and sustainability.
- **Secondary:** teachers who want a quick, visual classroom aid.
- **Context of use:** at a recycling station or classroom, on a phone, in under a minute.

User needs that shaped the design: speed, clear English, one main action per screen, a visible reason, and an obvious way to try again.

## 4. Solution design

EcoScan AI is a responsive web application with a single, focused flow:

1. **Capture or upload** an image (camera via `getUserMedia`, or file upload as a fallback).
2. **Preview** the selected image before sending it.
3. **Analyse** — the image goes to the server, which calls the AI model and validates the response.
4. **Result** — item name, category, recyclable status, confidence, decision reason, cleaning steps, learning fact, safety note, and sources.
5. **Learn** — a one-question quiz with the correct answer and an explanation.
6. **Repeat** — "New scan" returns the user to the camera.

**Scope decisions (MVP):** one classification flow, one quiz, honest unknown/low-confidence states, and cited Macau data. Explicitly out of scope: accounts, scan history, additional languages, custom-trained models, and social sharing. These were excluded to keep the prototype small enough for a three-person student team to build, test, and fully explain.

## 5. System architecture

```text
[ Phone / tablet / desktop browser ]
  React + Vite  ·  responsive, English UI
  Camera (getUserMedia, HTTPS) or image upload
  Preview  ->  Confirm  ->  Loading
        |  POST /api/classify  (multipart/form-data, one "image" field)
        v
[ Node.js + Express server ]   (API key only in server .env)
  - validates file type (JPEG/PNG/WebP) and size (<= 10 MB) in memory
  - checks the real file signature, not just the MIME type
  - calls the AI provider with the image + Macau starter rules
  - validates and normalises the returned JSON against the fixed contract
  - maps failures to clear English error codes
        |  base64 image + system prompt
        v
[ DeepSeek  deepseek-flash  (vision + JSON output) ]
        |  fixed JSON
        v
[ React result screen ]
  category badge · recyclable status · confidence meter
  decision reason · cleaning steps · learning fact · safety note · sources
  one-question quiz with answer and explanation
```

**Responsibility boundaries**

- **React client:** interaction, camera/upload, preview, loading/error/result states, quiz. Contains no API key.
- **Express server:** validation, CORS, secret handling, provider communication, error handling, response normalisation. Images are processed in memory and are not written to disk.
- **AI model:** visual identification and generation of the English explanation, cleaning guidance, and quiz draft, constrained by the prompt and the response contract.
- **Macau rules data:** the local policy source; it must be verified against current official guidance before public use.

**Deployment concept:** the React client can be hosted as a static site (for example Vercel) and the Node.js server on a host that supports server-side environment variables (for example Render). Camera access requires HTTPS. The backend cannot run on a static host, and the API key must never be placed in the frontend.

## 6. AI model and prompt design

**Model and endpoint**

- Provider: DeepSeek, Inc.
- Endpoint: `https://api.deepseek.com` (OpenAI-compatible `/chat/completions`).
- Model: `deepseek-flash` (DeepSeek-V4.1-Flash), which supports image input via an `image_url` content part containing a base64 data URL.
- The server additionally uses `response_format: { "type": "json_object" }` to request JSON output, and sets `thinking: { "type": "disabled" }` for this structured classification task.

**Why the model choice matters.** The project originally assumed a single text model. Verification against the official DeepSeek documentation confirmed that `deepseek-flash` accepts image input and can therefore do both jobs — reading the image and writing the English explanation — without a separate vision service. This keeps the architecture simple and fully explainable.

**Prompt strategy.** The system prompt:

- sets the role ("EcoScan AI, an environmental education assistant for students in Macau");
- requires **JSON only**, and lists every required field;
- restricts the model to the **supplied Macau starter guidance** and forbids applying other regions' rules;
- contains explicit conservative rules (used tissues, napkins, paper towels, wet/greasy/soiled paper → `general_waste`);
- instructs the model to return `unknown` with a low confidence when the image is blurry, unrelated, mixed-material, contaminated, or unmatched by the guidance;
- forbids inventing carbon or energy numbers;
- requires clear English for all user-facing text.

**Response contract (validated server-side).** The server rejects a response unless it contains a valid `itemName`, a `category` from the allowed set, and a `confidence` between 0 and 1, and it filters `sources` against the allowed list. `category` may be one of: `plastic`, `paper`, `metal`, `glass`, `organic`, `electronic`, `general_waste`, `unknown`. If an item is not confidently matched, the system enforces `unknown` with `recyclable: null`.

The contract also includes `disposalOptions`, an array of `{ title, guidance, precautions, location, source }`. This lets an item with several official channels (for example batteries) return every channel with its preparation steps and location. The server drops any option whose source is not in the supplied source list, so the model cannot invent a channel or a location. This is a curated approach: it needs no runtime web fetch, works offline, and stays explainable.

**A real engineering issue we found and fixed.** During testing, some live scans failed with an invalid-response error. Investigation showed that the model's *reasoning* tokens were consuming the whole `max_tokens` budget before any JSON content was produced, so the response arrived truncated or empty. We confirmed this directly from the provider usage data (a request returned `finish_reason: "length"` with `reasoning_tokens: 900` and empty content). The fix was to disable thinking for this structured task and allow sufficient output tokens, after which repeated live calls returned valid JSON consistently. This is documented here because it is a genuine part of the project's engineering work.

## 7. Data sources

**Macau recycling guidance.** The starter rules file is `server/data/macau-recycling-rules.json`. It is intentionally small and conservative and currently points to:

- **Name:** Macao SAR Government Environmental Protection Bureau (DSPA)
- **URL:** https://www.dspa.gov.mo/
- **Accessed:** 2026-10-02
- **Use:** the official local starting point that must be confirmed before publishing item-level rules.

Battery guidance is backed by four additional official DSPA pages, read on 2026-10-03:

- **Macau Waste Battery Collection Scheme (overview):** https://www.dspa.gov.mo/richtext2.aspx?a_id=101411 — scheme scope, more than 1,300 collection points, and accepted battery types.
- **Waste Battery Collection Scheme (FAQ):** https://www.dspa.gov.mo/richtext2.aspx?a_id=101413 — handling precautions and routing for chargers and large batteries.
- **Electronic and Electrical Equipment Recycling Programme:** https://www.dspa.gov.mo/richtext3.aspx?a_id=1506045567 — the channel for chargers and electrical equipment.
- **Large batteries:** https://www.dspa.gov.mo/richtext3.aspx?a_id=1654824890 — large battery types, mobile collection points, and the pretreatment workshop at 218 North Frontoft, Taipa.

Every rule carries `sourceNeeded: true`, and the app displays it, to make the limitation visible. **Pending:** the team must replace the homepage reference with the exact current DSPA page or document for each category before claiming a rule is fully verified.

**Coverage note.** The starter dataset contains `plastic`, `paper`, `metal`, `glass`, `general_waste`, and, since this revision, `electronic`. The `electronic` rule covers batteries and is backed by four official DSPA pages; it uses the new `disposalOptions` field because batteries have several Macau channels. The dataset does **not** yet contain a verified `organic` rule, so organic items (for example food scraps) correctly return `unknown` rather than a guessed category. Adding `organic` requires a reliable Macau source and is assigned to the data/education role.

**Learning content.** Learning facts are generated by the model under the prompt's constraints and must not contain unsupported carbon or energy figures. Any quantitative environmental claim requires a named source and access date.

**Images.** Only anonymous, permission-cleared test images are used. No personal photos, faces, names, or student numbers are stored or committed.

## 8. Testing method

Testing is organised in layers, from smallest and most repeatable to most realistic:

1. **Static checks:** lint for client and server.
2. **Automated server tests:** request validation, image-signature checks, response normalisation, conservative paper handling, retry behaviour, and the unconfigured-key path.
3. **Build test:** production build of the React client.
4. **HTTP smoke tests:** health endpoint and each error path of `/api/classify`.
5. **Live AI checks:** real scans with anonymous images.
6. **User testing:** a short session with 3–5 classmates or teachers using prepared anonymous images, recording the item, the returned category, whether it was correct, and whether the user understood the reason.

The user-testing protocol records results in a simple table. Results are entered only after the test is actually performed.

## 9. Results

### 9.1 Recorded local verification (2026-10-03)

| Check | Command / action | Result |
| --- | --- | --- |
| Server unit tests | `npm --prefix server test` | **8 tests passed, 0 failed** |
| Server lint | `npm --prefix server run lint` | Passed |
| Client lint | `npm --prefix client run lint` | Passed |
| Client build | `npm --prefix client run build` | Passed (production build) |
| Health | `GET /api/health` | `200`, reports whether the AI key is configured (no key revealed) |
| No image | `POST /api/classify` | `400` `IMAGE_REQUIRED` |
| Wrong file signature | `POST /api/classify` with a non-image file | `415` `INVALID_IMAGE_CONTENT` |
| Valid image, no server key | `POST /api/classify` | `503` `AI_NOT_CONFIGURED` |

The automated tests cover, among others: retry after an empty provider response; the explicit unconfigured-key error; JPEG/PNG/WebP signature acceptance; MIME/content mismatch rejection; normalisation of a valid classification; rejection of an unknown category; forcing unknown items to be non-decisive and filtering sources; and downgrading tissue-like paper that the model mislabelled as recyclable paper.

### 9.2 Live AI classification checks

These are real, unedited runs of the deployed code with a real server-side key.

| Test image | Returned item | Category | Recyclable | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Anonymous crumpled-paper reference | paper-like item | `general_waste` | `false` | 0.68 | Conservative paper safeguard applied as designed |
| Apple illustration (synthetic test) | "Red apple" | `unknown` | `null` | ~0.2–0.3 | Correct: `organic` is not in the starter dataset, so the app refused to guess |
| AA battery (synthetic test) | "AA battery" | `electronic` | `true` | 0.95 | Five sourced `disposalOptions` returned from the DSPA battery pages |

A repeated live-call test of five consecutive scans returned HTTP 200 with valid JSON every time after the token-budget fix described in Section 6.

### 9.3 User (classroom) testing

**Status: Pending.**

| Participant | Item | Returned category | Correct? | Understood the reason? | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | Not yet run |

Do not fill this table before the session. The competition requires a small-scale test in a simulated or small real educational setting; this step must be completed and recorded honestly before submission.

## 10. Limitations

- **Model uncertainty.** The AI can misidentify blurry, occluded, unrelated, or mixed-material items. The app mitigates this with `unknown` and low-confidence states, but cannot eliminate error.
- **Rule coverage.** The starter dataset is incomplete (`organic` and `electronic` are missing) and must be verified against exact current DSPA guidance.
- **Data freshness.** Recycling rules can change; the dataset needs periodic review.
- **Confidence is not accuracy.** The displayed percentage is the model's self-estimate, not a measured accuracy rate. The interface labels it as an estimate.
- **Evaluation size.** Formal accuracy has not been measured with a benchmark; only a small set of live checks has been recorded so far.
- **Camera constraints.** Browsers require HTTPS (or localhost) for camera access; the upload path is the fallback.
- **Language scope.** The interface is English only in this version.

## 11. Ethics, privacy, and responsible AI

- **No personal data.** Users must not upload faces, names, student numbers, or other sensitive information. Test images are anonymous.
- **Third-party processing.** Images are sent to the configured AI provider for analysis; this is disclosed. Images are processed in memory and are not intentionally stored by the application.
- **No absolute claims.** Results are presented as learning guidance, with a visible reminder to check current local rules before disposal. The app never presents an AI result as a final decision.
- **Uncertainty first.** When unsure, the system returns `unknown` rather than guessing.
- **Secret safety.** The API key exists only in server environment variables and is never placed in the frontend or committed to Git.
- **No fabricated data.** Unsupported carbon, energy, accuracy, or user numbers are never displayed.
- **Bias and error.** Known failure modes (blur, mixed materials, unusual packaging) and the incomplete rules dataset are documented and included in the report rather than hidden.

## 12. AI usage disclosure

In line with the competition's disclosure requirement:

| Tool | Version / model | Used for |
| --- | --- | --- |
| DeepSeek API | `deepseek-flash` (DeepSeek-V4.1-Flash) | Runtime image recognition and English explanation, cleaning steps, learning fact, and quiz draft |
| AI coding assistant | [Tool name and version] | [Describe: e.g. drafting code, documentation, and tests — to be confirmed and described accurately by the team] |

**Completed by students:** defining the problem and users; choosing the architecture; writing and reviewing the prompt; curating and citing the Macau rules data; implementing and testing the flow; designing the interface, quiz, and error states; and explaining limitations and ethics.

**AI-assisted:** parts of the code, documentation, and this report were drafted with AI assistance and then reviewed, tested, and corrected by the team. The runtime classification itself is performed by the DeepSeek model as described.

**Limitations and risks of AI use:** the model can produce incorrect or overconfident answers; generated text can contain errors; therefore all AI output is validated against a strict contract, humans review content, and the app is designed to say `unknown` when unsure.

## 13. References

1. DeepSeek API Documentation — Your First API Call and Models & Pricing. https://api-docs.deepseek.com/ (accessed 2026-10-03).
2. DeepSeek API Documentation — Vision guide. https://api-docs.deepseek.com/guides/vision (accessed 2026-10-03).
3. DeepSeek API Documentation — Chat Completions reference. https://api-docs.deepseek.com/api/create-chat-completion (accessed 2026-10-03).
4. Macao SAR Government Environmental Protection Bureau (DSPA). https://www.dspa.gov.mo/ (accessed 2026-10-02).
5. 2026 Global Youth AI Future Innovation Competition, Macau Secondary School Division — official guidelines. https://www.mcs.mo/articles/104 (see official pages for current rules; verify before submission).
6. Project repository — EcoScan AI. https://github.com/Anormalguybr/what

> Before submission, replace every `[FILL IN]` and the bracketed AI-assistant row with the team's real information, and update Section 9.3 and the status line to match what has actually been completed.
