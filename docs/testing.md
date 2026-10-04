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

## Education test

Recruit 3–5 classmates or teachers and use anonymous prepared images. Record the item, returned category, whether the user understood the reason, and any error. Do not fill in results before the test is performed.

## Browser checks

More information navigation regression, 2026-10-04: expanding details calls `scrollIntoView` only after the section is visible; collapsing does not trigger navigation. Reduced-motion preferences select immediate scrolling. `npm --prefix client test` passed 13 tests, and client lint/build passed. Browser fixture checks at 1440x900, 768x1024 and 390x844 confirmed the details section entered the viewport without horizontal overflow or unexpected console errors. These navigation checks did not call either AI provider.

Illustration placement regression, 2026-10-04: Material notebook (image, legend and all generation states) is now the first full-width section inside More information. Browser fixture checks at 1440x900, 768x1024 and 390x844 confirmed it is hidden before expansion, visible afterwards and reached by auto-scroll without overflow or console errors. The existing generation test verifies that closing and reopening preserves the generated image and does not send another request. Client tests remained 13/13; lint and production build passed. No live image generation was needed for this presentation-only change.

Pre-upload review, 2026-10-04: client tests passed 13/13 and server tests passed 26/26; both lint commands, the client build and `git diff --check` passed. Browser fixture checks at 1440x900, 768x1024 and 390x844 reconfirmed illustration visibility and auto-scroll with no horizontal overflow, broken images or unexpected console warnings/errors. The mobile quiz returned the expected feedback. A local scan found neither configured backend key in repository files, the frontend build or Git history; private `.env` files were not tracked. This review did not repeat paid provider requests or physical-device tests.

Desktop preview layout regression, 2026-10-04: on the desktop scan screen a selected preview photo with a tall aspect ratio expanded the auto-sized grid row past the fixed `overflow: hidden` workspace, pushing the floating Upload / Analyze / Retake bar below the clipped area while the page could not scroll. `.capture-workspace` now declares `grid-template-rows: minmax(0, 1fr)` (matching the existing mobile rule) so the preview is constrained to the stage. Verified with a headless Chrome DevTools Protocol fixture at 1366×800/768/720/690/660/640/600/560 using a portrait and a square image: the control bar and Analyze button are fully visible at every height of 640px or more, and below that the page scrolls to the bottom. This also corrected the sidebar stretching to the image height. `npm --prefix client test` passed 13/13 and client lint and production build passed. The classify request was stubbed, so no AI provider was called. A portrait preview still makes the transient loading card taller than 620px; it stays scrollable and was left unchanged.

Test the client at desktop 1440×900, tablet 768×1024, and mobile 390×844. Check live camera permission, captured-frame preview, upload fallback, loading screen, API error state, concise result summary, `More information`, fixed back button, quiz interaction, keyboard focus, and horizontal overflow. A phone on a plain HTTP LAN URL may be blocked from `getUserMedia`; record that as an environment limitation and test the upload fallback unless HTTPS is configured.
