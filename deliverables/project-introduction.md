# EcoScan AI — Project Introduction

**Competition:** 2026 Global Youth AI Future Innovation Competition, Macau Secondary School Division
**Category:** AI for Social Innovation
**Team:** [Team members: names] · **School:** [School name] · **Date:** [Submission date]
**Repository:** https://github.com/Anormalguybr/what

> One line: EcoScan AI turns a phone camera into a waste-sorting teacher — it recognises an item, suggests how to sort it in Macau, and explains the reason so students learn, not just copy.

---

## 1. The problem

Students in Macau want to recycle correctly, but the decision at the bin is often a guess. Recycling rules are specific and local: a clean plastic bottle can be recycled, a greasy pizza box cannot, and a used tissue is never paper recycling. When one contaminated item is placed in the wrong bin, it can spoil a whole batch of collected material. Most people never see the reason behind a sorting rule, so the mistake repeats.

This is an education problem as much as a waste problem. Information exists, but it is scattered across official pages and rarely explained in a classroom-ready way, in English, at the exact moment a student is holding an object and about to make a decision.

## 2. Target users

- **Primary:** secondary school students in Macau learning about recycling and sustainability.
- **Secondary:** teachers who need a quick, visual teaching aid for environmental education.
- **Also:** any Macau resident who wants a simple second opinion before using a recycling bin.

The interface is designed for phones first, then tablets and desktop computers, and all user-facing text is in clear English.

## 3. Educational context

EcoScan AI is built around a single learning loop: **see an object → get a cautious answer → read why → check yourself.** Instead of a label with no explanation, every result includes the reason for the suggested category, a short environmental learning fact, and a one-question knowledge check with the correct answer and an explanation. This design follows the competition's 2026 theme, "AI and Education", by using AI to build understanding rather than to replace the learner's judgement.

## 4. Main functions

1. **Capture or upload.** The user takes a photo with the phone camera or uploads an existing image (JPEG, PNG, or WebP).
2. **Preview and confirm.** The selected image is shown before analysis, so the user stays in control.
3. **AI analysis.** The image is sent to the server, which calls a real vision AI model and returns a fixed set of fields.
4. **Clear result.** The app shows the item name, suggested category, whether it is recyclable, a confidence estimate, the decision reason, and — when an item has several official Macau channels such as batteries — each disposal option with its preparation steps, location, and source.
5. **Learning support.** Cleaning steps, an environmental learning fact, a safety note, and a short quiz with feedback.
6. **Uncertainty handling.** When the model is not sure, or no local rule matches, the app returns **unknown** and asks the user to check current local guidance. It does not guess.
7. **Responsive, English interface** with explicit loading, success, unknown, low-confidence, network, and error states.

## 5. AI methods

EcoScan AI uses a real, hosted vision-language model rather than fixed rules pretending to be AI.

- **Provider and model:** DeepSeek, via the OpenAI-compatible endpoint `https://api.deepseek.com`, using the `deepseek-flash` model (DeepSeek-V4.1-Flash), which accepts image input.
- **Image understanding:** the photo is sent as a base64 image to the model, which identifies the visible item and its material and condition.
- **Prompt design:** a carefully written system prompt instructs the model to return English JSON only, to apply **only** the supplied Macau starter guidance, to treat used tissues, wet or greasy paper, and food-soiled paper as general waste, and to return `unknown` with a low confidence rather than guess.
- **Fixed response contract:** the server validates the model's JSON against required fields (`itemName`, `category`, `recyclable`, `confidence`, `reason`, `cleaningSteps`, `disposalOptions`, `learningFact`, `safetyNote`, `sourceNeeded`, `sources`, `quiz`) before sending it to the client, and it drops any disposal option whose source is not on the approved list.
- **Server-side key:** the API key lives only in the server environment variables. It is never exposed to the browser.

One model performs both the image recognition and the English explanation, which keeps the system small enough for a student team to understand, test, and explain.

## 6. Innovation

- **Local first.** Classification is tied to Macau guidance and cites the Macau Environmental Protection Bureau (DSPA), rather than applying another region's rules.
- **Teaches the "why".** The decision reason, learning fact, and quiz turn a scanner into a learning tool.
- **Honest by design.** The app is built to say `unknown` when it is not confident, and the data layer flags when a rule still needs official confirmation.
- **Explainable and student-built.** Every part — prompt, response fields, validation, and interface — is written so the team can explain exactly what the AI does and does not do.

## 7. Connection to the SDGs

- **SDG 12 — Responsible Consumption and Production:** better sorting reduces contamination and supports responsible waste handling.
- **SDG 13 — Climate Action:** correct recycling and reduced waste support the shift toward a lower-impact lifestyle, presented without unverified carbon claims.
- **SDG 4 — Quality Education (supporting):** the tool builds environmental literacy through explanation and self-check.

## 8. Expected impact

For a student, each scan is a 30-second lesson that connects an object in their hand to a real local rule. Over repeated use, we expect improved sorting accuracy and, more importantly, an ability to explain *why* an item belongs in a given bin. For a teacher, EcoScan AI is a ready visual aid that starts a discussion instead of ending it with an answer.

Impact is measured through a small, honest test plan: a set of anonymous prepared images, a short session with 3–5 classmates or teachers, and a simple record of whether the classification was correct and whether the user understood the reason. Results are reported as they actually occur; unsupported carbon or accuracy numbers are never displayed.

## 9. Current status (honest)

- The web app runs locally with a real AI connection; the capture, analysis, result, and quiz flow is working.
- Automated server tests pass (request validation, image signatures, response normalization, retry behaviour, and the unconfigured-key path).
- Live scans have been recorded with anonymous test images.
- Classroom user testing with 3–5 participants is **[completed with N participants / scheduled — update before submission]**.
- Public deployment and the final demo video are **[to be completed / completed — update before submission]**.

> Fields in square brackets must be replaced with the team's real information before submission. No test result, user count, accuracy figure, or carbon number may be invented.
