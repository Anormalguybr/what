# Testing Plan

## Local checks

Run from the project root:

```bash
npm --prefix server test
npm --prefix server run lint
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

## Education test

Recruit 3–5 classmates or teachers and use anonymous prepared images. Record the item, returned category, whether the user understood the reason, and any error. Do not fill in results before the test is performed.

## Browser checks

Test the client at desktop 1440×900, tablet 768×1024, and mobile 390×844. Check live camera permission, captured-frame preview, upload fallback, loading screen, API error state, concise result summary, `More information`, fixed back button, quiz interaction, keyboard focus, and horizontal overflow. A phone on a plain HTTP LAN URL may be blocked from `getUserMedia`; record that as an environment limitation and test the upload fallback unless HTTPS is configured.
