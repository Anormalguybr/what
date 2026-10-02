# AI Usage Disclosure

## Intended provider

EcoScan AI is designed to use the configured DeepSeek vision model through a server-side OpenAI-compatible API. The exact provider model ID, image support, limits, and account availability must be verified against the current official provider documentation and a real server-side key before a live result is claimed.

## AI responsibilities

- identify the visible item and material from the uploaded image;
- draft a short English explanation and cleaning guidance;
- produce a learning fact and quiz draft in the fixed JSON contract.

## Student responsibilities

Students define the problem, curate and cite Macau recycling guidance, design the prompt and response fields, test the workflow, review errors, and explain the limitations. The application does not treat an AI result as an absolute local disposal decision.

## Limitations and risks

The model can misidentify blurry, occluded, unrelated, or mixed-material items. The application returns `unknown` when the response is uncertain or does not match supplied guidance. Local rules may change, so the source data needs periodic review. Images sent to the configured provider are a privacy consideration; test images must be anonymous.

