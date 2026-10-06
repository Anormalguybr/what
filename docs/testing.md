# Testing Plan

## Local checks

Run from the project root:

```bash
npm --prefix server test
npm --prefix server run lint
npm --prefix client test
npm --prefix client run lint
npm --prefix client run build
```

## API cases

| Case | Expected result | Status |
| --- | --- | --- |
| No image field | `IMAGE_REQUIRED` | To run locally |
| Unsupported file type | `UNSUPPORTED_IMAGE_TYPE` or request error | To run locally |
| Image larger than configured limit | `IMAGE_TOO_LARGE` | To run locally |
| No server API key | `AI_NOT_CONFIGURED` | To run locally |
| Valid image and valid key | Fixed classification JSON | Requires approved key and test image |
| Battery image | `category: electronic` with `disposalOptions` (each with a source) | Verified live on 2026-10-03 with a synthetic image |
| Provider timeout | `AI_TIMEOUT` | Requires controlled provider test |
| Unknown or blurry item | `category: unknown` | Requires approved test image |

## Recorded local verification

Recorded on 2026-10-03 in the local development environment:

- `npm --prefix server test`: 10 tests passed.
- `npm --prefix server run lint`: passed.
- `npm --prefix client run lint`: passed.
- `npm --prefix client run build`: passed.
- HTTP smoke checks: `/api/health` returned 200; no image returned `IMAGE_REQUIRED`; mismatched image content returned `INVALID_IMAGE_CONTENT`; a valid image without a server key returned `AI_NOT_CONFIGURED`.

Live provider classification and classroom user testing remain pending because no live key or participant results are recorded.

Live smoke check on 2026-10-03 with the anonymous crumpled-paper reference image returned `general_waste`, `recyclable: false`, and `confidence: 0.68` after the conservative paper safeguard.

Live smoke check on 2026-10-03 with a synthetic AA battery image returned `category: electronic`, `recyclable: true`, `confidence: 0.95`, and five `disposalOptions`, each carrying an official DSPA source URL. A synthetic apple image still returned `unknown` with an empty `disposalOptions` array, confirming the multi-option change did not weaken the unknown path.

## Educational illustration verification

Automated local checks for the illustration integration cover category/confidence gating, missing-key fallback, DeepSeek planning before RelayRouter generation, English plan validation, planner veto, supported inline image formats, invalid-image rejection, timeout handling, request validation, scan expiry, duplicate-job sharing, cached failure, the material legend, independent result rendering, and cancellation on return to the camera. Fixtures are synthetic and never contact the image provider.

For a live check, configure `IMAGE_API_KEY` in `server/.env`, restart the backend, confirm `visualGuideConfigured: true`, and scan an anonymous supported item. Confirm the actual image loads, numbered parts correspond to the English legend, material estimates are appropriately qualified, and the image contains no unsupported composition claims. Physical-phone tests and the real model's diagram quality require separate verification. Do not describe a fixture or unconfigured service as live image generation.

Recorded on 2026-10-04 for the educational-visual-guide branch:

- `npm --prefix server test`: 26 passed; provider responses were mocked for image-generation tests.
- `npm --prefix client test`: 12 passed, including non-blocking loading, failure, skip, English legend, cancellation, malformed illustration responses and image-load errors.
- Both lint commands and the client production build passed.
- Browser QA used the actual React App and VisualGuide components with explicit synthetic classification/image responses and a cropped user-provided reference photo. Ready results were inspected at 1440x900, 768x1024, 390x844 and 320x740, without horizontal overflow or broken images; loading/failed/skipped states and More information were inspected at 390x844. No unexpected console errors were recorded in this fixture.
- A real DeepSeek classification through `/api/classify` identified the anonymous reference bottle as `plastic`, confidence `0.82`. With no image key set, the response correctly returned `visualGuide.status: unavailable`; no RelayRouter image-generation request was made.
- RelayRouter documentation lists Gemini image generation and the chat-compatible `/v1/chat/completions` endpoint. Actual image-model availability, output format and illustration quality are not verified until the image key is configured.

Live illustration smoke test on 2026-10-04 after the image key was configured:

- Restarted the local backend to reload `server/.env`; `/api/health` then returned `visualGuideConfigured: true`.
- Reused the anonymous bottle reference photo through the real browser workflow. DeepSeek classified it as `plastic`, `recyclable: true`, confidence `0.85`.
- DeepSeek planning and RelayRouter `gemini-3.1-flash-lite-image` completed successfully through the configured chat-compatible endpoint. The browser displayed a real generated bitmap at 1408x768 with five numbered English legend entries: Cap, Neck, Body, Base and Label.
- Inspected the loaded result at 1440x900 and 390x844. No horizontal overflow or unexpected console warnings/errors were observed. More information and Quick check remained available.
- The generated diagram is a generic simplified bottle, not a precise reproduction of the photograph. It adds a typical label, whose presence/material is not confirmed by the source photo; the legend explicitly qualifies its materials as typical estimates. This single successful smoke test does not establish factual accuracy or generation reliability across other items.
- Generated-image and browser-screen evidence is under `tmp/visual-guide/`, excluded from commits. No original student photos were stored by the backend, and no secrets were printed.

## Classification accuracy verification

The configured model `deepseek-flash` was verified to accept image input and classify images, and the identification prompt was revised so clear everyday items keep their material category instead of falling back to `unknown`.

Recorded on 2026-10-06:

- A synthetic 320x320 PNG (a blue rectangle above a red disc on a white/green background) was described correctly by the API, confirming that image input is genuinely processed rather than ignored.
- An anonymous, uncommitted Wikimedia Commons photo of a discarded plastic bottle (CC BY-SA 4.0) was classified through the real local server:
  - With the previous prompt: itemName "Plastic water bottle …", category `unknown`, confidence 0.25.
  - With the revised prompt: itemName "plastic water bottle", category `plastic`, recyclable true, confidence 0.80–0.88, in about 2.3–3.2 seconds.
- An ambiguous mixed-material antique (glass bottles in a wooden case) stayed `unknown` at confidence 0.4, so the conservative guard is intact.
- `server/test/prompt.test.js` guards the identification-first structure, the honesty rules, and the required response fields.
- `server/test/suggested-bin.test.js` verifies that every recyclable category maps to a named, sourced Macau bin, that the bins with a published photo point to a real file on disk with DSPA attribution, and that `unknown` maps to no bin. A live server smoke check confirmed the classify response carries the `suggestedBin` key (null for an unrecognisable image) and that `/api/bin-images/...` serves the three unmodified DSPA photos with the correct content types.

These checks used the real provider key on the local server. They are a small sample, not a benchmark, and do not establish accuracy across every item. A wider labelled test set is still needed.

## Recycling point finder verification

Automated checks cover the channel summaries, region and free-text filtering, pagination clamping, the dataset's source links, the nearest-point ranking with and without a category, and the HTTP routes (valid request, invalid region, unknown channel, invalid coordinates, unknown category, and that `nearby` is not treated as a channel id). The client tests open the finder from the capture screen, list a channel, open it, filter by area, confirm the result-page drop-off link, cover the geolocation success and permission-denied paths with a mocked `navigator.geolocation`, show the post-scan nearest panel with the scanned category, and confirm a non-recyclable scan shows no suggestion.

Recorded on 2026-10-06:

- `npm --prefix server test`: 31 passed.
- `npm --prefix server run lint`: passed.
- `npm --prefix client test`: 20 passed.
- `npm --prefix client run lint`: passed.
- `npm --prefix client run build`: passed.
- `npm --prefix server run import:points` fetched the official DSPA pages and wrote 1,590 points across 11 channels (Eco Fun stations 10, mobile truck 32, street stations 3, service points 5, community points 12, clothing 20, glass 90, light tubes 417, electronics fixed 22, electronics mobile 32, batteries 947), captured 2026-10-06. 62 points carry official coordinates from `ecofunweb/read_time.aspx?station=ALL`.
- HTTP smoke checks: `/api/recycling-points` returned the 11 channel summaries and `locatedTotal: 62`; `/api/recycling-points/eco-fun-stations?region=macau` returned 7 points; `/api/recycling-points/glass?region=coloane` returned 9 points with DSPA map links; an invalid region returned 400 and an unknown channel returned 404.
- Nearest-point smoke check: `GET /api/recycling-points/nearby?lat=22.1912&lng=113.5359&limit=5` ranked 環保加Fun站（下環）first at 4 m, then mobile truck stops and service points, all from the Eco Fun network; `lat=999` returned 400.
- Category-filtered nearest check: the same position with `category=electronic` returned 42 points (Eco Fun stations and the mobile truck only, which are the groups that accept electronics), `category=glass` returned 62, `category=general_waste` returned 0 with `stream: null`, and `category=banana` returned 400.

The point lists are a website snapshot. The finder and the nearest search were exercised against the committed dataset and the local API, not against a live DSPA feed, and the coordinates come from the Eco Fun endpoint rather than the address-only channels. Physical-device location and layout checks for the new screen remain to be done.

## Education test

Recruit 3–5 classmates or teachers and use anonymous prepared images. Record the item, returned category, whether the user understood the reason, and any error. Do not fill in results before the test is performed.

## Browser checks

More information navigation regression, 2026-10-04: expanding details calls `scrollIntoView` only after the section is visible; collapsing does not trigger navigation. Reduced-motion preferences select immediate scrolling. `npm --prefix client test` passed 13 tests, and client lint/build passed. Browser fixture checks at 1440x900, 768x1024 and 390x844 confirmed the details section entered the viewport without horizontal overflow or unexpected console errors. These navigation checks did not call either AI provider.

Illustration placement regression, 2026-10-04: Material notebook (image, legend and all generation states) is now the first full-width section inside More information. Browser fixture checks at 1440x900, 768x1024 and 390x844 confirmed it is hidden before expansion, visible afterwards and reached by auto-scroll without overflow or console errors. The existing generation test verifies that closing and reopening preserves the generated image and does not send another request. Client tests remained 13/13; lint and production build passed. No live image generation was needed for this presentation-only change.

Pre-upload review, 2026-10-04: client tests passed 13/13 and server tests passed 26/26; both lint commands, the client build and `git diff --check` passed. Browser fixture checks at 1440x900, 768x1024 and 390x844 reconfirmed illustration visibility and auto-scroll with no horizontal overflow, broken images or unexpected console warnings/errors. The mobile quiz returned the expected feedback. A local scan found neither configured backend key in repository files, the frontend build or Git history; private `.env` files were not tracked. This review did not repeat paid provider requests or physical-device tests.

Desktop preview layout regression, 2026-10-04: on the desktop scan screen a selected preview photo with a tall aspect ratio expanded the auto-sized grid row past the fixed `overflow: hidden` workspace, pushing the floating Upload / Analyze / Retake bar below the clipped area while the page could not scroll. `.capture-workspace` now declares `grid-template-rows: minmax(0, 1fr)` (matching the existing mobile rule) so the preview is constrained to the stage. Verified with a headless Chrome DevTools Protocol fixture at 1366×800/768/720/690/660/640/600/560 using a portrait and a square image: the control bar and Analyze button are fully visible at every height of 640px or more, and below that the page scrolls to the bottom. This also corrected the sidebar stretching to the image height. `npm --prefix client test` passed 13/13 and client lint and production build passed. The classify request was stubbed, so no AI provider was called. A portrait preview still makes the transient loading card taller than 620px; it stays scrollable and was left unchanged.

Test the client at desktop 1440×900, tablet 768×1024, and mobile 390×844. Check live camera permission, captured-frame preview, upload fallback, loading screen, API error state, concise result summary, `More information`, fixed back button, quiz interaction, keyboard focus, and horizontal overflow. A phone on a plain HTTP LAN URL may be blocked from `getUserMedia`; record that as an environment limitation and test the upload fallback unless HTTPS is configured.
