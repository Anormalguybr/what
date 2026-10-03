# Data Sources

## Macau recycling guidance

The starter rules file is `server/data/macau-recycling-rules.json`. It is intentionally small and conservative. Each category currently points to the official Macao SAR Government Environmental Protection Bureau (DSPA) homepage as a starting source:

- Name: Macao SAR Government Environmental Protection Bureau (DSPA)
- URL: <https://www.dspa.gov.mo/>
- Accessed: 2026-10-02
- Use: identify the official local source that must be checked before publishing item-level rules

The team must replace or supplement this homepage reference with the exact current page or document for each item category before claiming that a classification rule is fully verified. The application uses `sourceNeeded: true` to make this limitation visible.

The prototype uses conservative handling for used tissues, napkins, paper towels, wet or greasy paper, receipts, and food-soiled paper: these are routed to `general_waste` rather than treated as clean recyclable paper. This safeguard still needs confirmation against the exact current Macau collection guidance.

## Learning content

The current learning fact is generated from the supplied prompt and must not contain unsupported carbon or energy numbers. Add a named source and access date before adding quantitative environmental claims.

## Images and privacy

Use anonymous, permission-cleared test images only. Do not commit personal photos or student information.
