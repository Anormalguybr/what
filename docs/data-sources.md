# Data Sources

## Macau recycling guidance

The starter rules file is `server/data/macau-recycling-rules.json`. It is intentionally small and conservative. Each category currently points to the official Macao SAR Government Environmental Protection Bureau (DSPA) homepage as a starting source:

- Name: Macao SAR Government Environmental Protection Bureau (DSPA)
- URL: <https://www.dspa.gov.mo/>
- Accessed: 2026-10-02
- Use: identify the official local source that must be checked before publishing item-level rules

The team must replace or supplement this homepage reference with the exact current page or document for each item category before claiming that a classification rule is fully verified. The application uses `sourceNeeded: true` to make this limitation visible.

The prototype uses conservative handling for used tissues, napkins, paper towels, wet or greasy paper, receipts, and food-soiled paper: these are routed to `general_waste` rather than treated as clean recyclable paper. This safeguard still needs confirmation against the exact current Macau collection guidance.

## Battery and electronic guidance

Batteries are handled through dedicated Macau channels, not the ordinary recycling bins. The following official DSPA pages were read on 2026-10-03 and curated into the `electronic` rule and its `disposalOptions`:

- DSPA - Macau Waste Battery Collection Scheme (overview): <https://www.dspa.gov.mo/richtext2.aspx?a_id=101411> - scheme scope, more than 1,300 collection points across Macau, and the accepted battery types (single-use cylindrical and button cells; rechargeable Li-ion, Li-polymer, NiMH, NiCd).
- DSPA - Waste Battery Collection Scheme (FAQ): <https://www.dspa.gov.mo/richtext2.aspx?a_id=101413> - handling precautions (remove batteries from devices; tape metal contacts; tape and bag broken or swollen batteries) and routing for chargers and large batteries.
- DSPA - Electronic and Electrical Equipment Recycling Programme: <https://www.dspa.gov.mo/richtext3.aspx?a_id=1506045567> - the collection channel for chargers and electrical equipment.
- DSPA - Large batteries: <https://www.dspa.gov.mo/richtext3.aspx?a_id=1654824890> - large battery types (car lead-acid, UPS, electric and hybrid vehicle), mobile collection points, and the pretreatment workshop at 218 North Frontoft, Taipa, Macau.

These entries describe the situation as published on the access date and still need periodic review, because collection points and rules can change.

## Learning content

The current learning fact is generated from the supplied prompt and must not contain unsupported carbon or energy numbers. Add a named source and access date before adding quantitative environmental claims.

## Images and privacy

Use anonymous, permission-cleared test images only. Do not commit personal photos or student information.
