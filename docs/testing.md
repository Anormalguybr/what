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
| Provider timeout | `AI_TIMEOUT` | Requires controlled provider test |
| Unknown or blurry item | `category: unknown` | Requires approved test image |

## Education test

Recruit 3–5 classmates or teachers and use anonymous prepared images. Record the item, returned category, whether the user understood the reason, and any error. Do not fill in results before the test is performed.

## Browser checks

Test the client at desktop 1440×900, tablet 768×1024, and mobile 390×844. Check upload preview, empty state, loading state, API error state, result layout, quiz interaction, keyboard focus, and horizontal overflow.

