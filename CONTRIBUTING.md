# Contributing to EcoScan AI

## Branches

Start from the latest `main` branch and create a focused branch:

```bash
git checkout main
git pull origin main
git checkout -b feature/frontend-upload
```

Use `feature/backend-ai` for server and AI work, and `feature/data-docs` for source data, education content, and documents. Do not push directly to `main`.

## Commits

Make small commits that describe the real change, for example:

```text
feat: add image preview state
fix: return a clear error when AI is unconfigured
docs: record Macau recycling source
```

Never commit `.env`, API keys, private photos, student information, or generated `node_modules` and build output.

## Pull requests

Before opening a Pull Request, run:

```bash
npm --prefix server test
npm --prefix server run lint
npm --prefix client run lint
npm --prefix client run build
```

Describe the user-visible change, files touched, checks run, and any unverified external dependency. Include screenshots for UI changes when useful.

## Review

At least one teammate reviews each Pull Request before merge. Reviewers should check privacy, English user-facing text, source citations, uncertainty handling, API-key safety, and mobile layout. Do not merge claims about live AI or user testing until they have evidence.

