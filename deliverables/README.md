# EcoScan AI — Competition Deliverables

This folder holds the English materials for the 2026 Global Youth AI Future Innovation Competition (Macau Secondary School Division).

## Files

| File | Deliverable | Requirement | Status |
| --- | --- | --- | --- |
| `demo-video-script.md` | Demonstration video script | English, ≤ 5 min, clear narration | Draft complete — record after deployment is verified |
| `project-introduction.md` | Project Introduction | English, ≤ 2 pages | Draft complete — fill team fields |
| `research-report.md` | Research Report | English, 6–12 pages | Draft complete — update Section 9.3 after user testing |
| `poster.html` | Poster | English, portrait, 0.8 m × 1.1 m | Print-ready layout — insert screenshots and team fields |

## Before submission — required fill-ins

Search every file for `[` and replace each bracketed field with real information:

- [ ] Team member names and school
- [ ] Submission date and file names
- [ ] Deployed frontend URL (only if it is live and works over HTTPS)
- [ ] User-testing results (Section 9.3 of the report) — only after the test is really done
- [ ] AI coding-assistant tool name/version and exact role in the AI disclosure
- [ ] Poster screenshots (real app screens) and the QR code (only after the URL is verified)

## Exporting the files to PDF

**Poster (`poster.html`):**
1. Open `poster.html` in Chrome or Microsoft Edge.
2. Print (Ctrl+P) → Destination: **Save as PDF**.
3. Paper size: the file declares `800mm x 1100mm`. Set **Margins: None** and **Scale: 100%**.
4. Save as `Poster_EcoScanAI.pdf`. Check the PDF page size is 800 × 1100 mm.
5. The QR box is a placeholder. Add a real QR code only after the deployed URL is confirmed working, and test that it opens the correct page.

**Project Introduction and Research Report (Markdown):**
- Paste into Google Docs / Microsoft Word, apply a clean style, and export to PDF (`ProjectIntroduction_EcoScanAI.pdf`, `ResearchReport_EcoScanAI.pdf`), keeping the Intro to ≤ 2 pages and the Report to 6–12 pages.
- Keep each file under 50 MB.

**Demo video:** export `DemoVideo_EcoScanAI.mp4`, under 5 minutes, with English narration or English subtitles.

## Integrity rules (do not break these)

- Do not invent test results, participant counts, accuracy figures, carbon savings, or market impact.
- Mark anything not yet done as **Pending**.
- Never show a real API key, `.env` file, or private data in a screenshot or video.
- Present recordings as recordings; never call a pre-recorded clip a live AI scan.
- Keep all user-facing text in English.

## Source of truth

- Internal project rules: `../AGENTS.md`
- Development status and sources: `../docs/` (architecture, data sources, testing, AI disclosure)
