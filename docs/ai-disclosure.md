# AI Usage Disclosure

## Intended provider

EcoScan AI is designed to use the configured DeepSeek vision model through a server-side OpenAI-compatible API. The exact provider model ID, image support, limits, and account availability must be verified against the current official provider documentation and a real server-side key before a live result is claimed.

## AI responsibilities

- identify the visible item and material from the uploaded image;
- draft a short English explanation and cleaning guidance;
- produce a learning fact and quiz draft in the fixed JSON contract.
- decide whether an educational image plan can responsibly describe the identified object and write its English prompt and broad material legend;
- generate a simplified Japanese anime-inspired illustration through RelayRouter's `gemini-3.1-flash-lite-image` chat-compatible API.

The drawing model receives text descriptions rather than original student photos. The website labels the result as an AI-generated educational illustration. Materials are estimated; exact plastics, internal layers, manufacturing processes and chemistry are not verified by this workflow. Electronics guides show only intact exteriors and safe handling/collection. Low-confidence and unknown items are skipped, and the planner can veto otherwise eligible items.

An image-generation failure does not invalidate the sorting result. Tests using synthetic API responses verify the integration contract; they are not evidence that the real image provider produced a correct diagram. A live bottle smoke test on 2026-10-04 successfully generated and displayed a five-part illustration. The diagram included a typical label not confirmed by the photograph. It demonstrates the integration, not exact material accuracy. Wider factual review and classroom evaluation remain pending.

## Student responsibilities

Students define the problem, curate and cite Macau recycling guidance, design the prompt and response fields, test the workflow, review errors, and explain the limitations. The application does not treat an AI result as an absolute local disposal decision.

## Limitations and risks

The model can misidentify blurry, occluded, unrelated, or mixed-material items. The application returns `unknown` when the response is uncertain or does not match supplied guidance. Local rules may change, so the source data needs periodic review. Images sent to the configured provider are a privacy consideration; test images must be anonymous.
