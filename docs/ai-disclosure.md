# AI Usage Disclosure

## Intended provider

EcoScan AI is designed to use the configured DeepSeek vision model through a server-side OpenAI-compatible API. The exact provider model ID, image support, limits, and account availability must be verified against the current official provider documentation and a real server-side key before a live result is claimed.

## Verified vision behaviour and prompt design

On 2026-10-06 the configured model `deepseek-flash` at `https://api.deepseek.com` was verified to accept image input: a synthetic shape image was described correctly, and real photos were classified end to end with the server key. This resolves the earlier uncertainty about image support.

The system prompt in `server/src/prompt.js` separates identification from the recycling decision. It first names the single main object decisively, then estimates the material and condition, and only then applies the supplied Macau guidance. `unknown` is reserved for images where the object cannot be identified or the material cannot be matched. A normal everyday item that is only slightly dirty keeps its material category, and the cleaning requirement moves into `cleaningSteps`. The prompt forbids inventing a channel, location, source, or environmental number, and it keeps text fields short so the answer stays fast.

Measured on 2026-10-06 with an anonymous, uncommitted Wikimedia Commons photo of a discarded plastic bottle (CC BY-SA 4.0):

- Before the change: itemName "Plastic water bottle …", category `unknown`, confidence 0.25.
- After the change: itemName "plastic water bottle", category `plastic`, recyclable true, confidence 0.80–0.88.

An ambiguous mixed-material antique (glass bottles inside a wooden case) correctly stayed `unknown` at confidence 0.4, which shows the conservative guard still works. With `thinking` disabled, an end-to-end classification returned in roughly 2.3–3.2 seconds on the local server.

## AI responsibilities

- identify the visible item and material from the uploaded image;
- draft a short English explanation and cleaning guidance;
- produce a learning fact and quiz draft in the fixed JSON contract.
- decide whether an educational image plan can responsibly describe the identified object and write its English prompt and broad material legend;
- generate a simplified Japanese anime-inspired illustration through RelayRouter's `gemini-3.1-flash-lite-image` chat-compatible API.

The drawing model receives text descriptions rather than original student photos. The website labels the result as an AI-generated educational illustration. Materials are estimated; exact plastics, internal layers, manufacturing processes and chemistry are not verified by this workflow. Electronics guides show only intact exteriors and safe handling/collection. Low-confidence and unknown items are skipped, and the planner can veto otherwise eligible items.

The suggested Macau collection bin is not produced by the model. It is a curated lookup from the rules file, keyed on the validated category, so a bin, a colour, or a facility is never invented. The bin photo is official DSPA content served unmodified with attribution and the date obtained; it is not AI-generated.

An image-generation failure does not invalidate the sorting result. Tests using synthetic API responses verify the integration contract; they are not evidence that the real image provider produced a correct diagram. A live bottle smoke test on 2026-10-04 successfully generated and displayed a five-part illustration. The diagram included a typical label not confirmed by the photograph. It demonstrates the integration, not exact material accuracy. Wider factual review and classroom evaluation remain pending.

## Student responsibilities

Students define the problem, curate and cite Macau recycling guidance, design the prompt and response fields, test the workflow, review errors, and explain the limitations. The application does not treat an AI result as an absolute local disposal decision.

## Limitations and risks

The model can misidentify blurry, occluded, unrelated, or mixed-material items. The application returns `unknown` when the response is uncertain or does not match supplied guidance. Local rules may change, so the source data needs periodic review. Images sent to the configured provider are a privacy consideration; test images must be anonymous.
