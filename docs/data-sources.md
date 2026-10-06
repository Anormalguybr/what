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
- DSPA - Reduce and Recycle the Easy Way: <https://www.dspa.gov.mo/RecycleIndexPage.aspx> - official overview of Macau's three-colour public recycling bins (plastic bottles, aluminium and steel cans, paper) and the dedicated battery, electronic, lamp, glass, food waste and clothing channels. This page is the source for the `bins` section of `macau-recycling-rules.json`.

These entries describe the situation as published on the access date and still need periodic review, because collection points and rules can change.

## Recycling drop-off locations

The drop-off finder uses a separate generated file, `server/data/macau-recycling-points.json`, built by `server/scripts/import-recycling-points.mjs`. The importer reads the official DSPA pages on the access date and records each point with the source it came from. The file is committed so the API does not depend on the DSPA website at request time; re-run `npm --prefix server run import:points` to refresh it.

Sources captured on 2026-10-06:

- DSPA - Eco Fun recycling and application points: <https://www.dspa.gov.mo/ecofunweb/1station.aspx?lang=tc> - staffed Eco Fun stations with opening hours, the monthly mobile recycling truck schedule, weekly street stations and community service points.
- DSPA - Clothing recycling locations: <https://www.dspa.gov.mo/richtext_RecyclingClothes.aspx?a_id=1629876030> - clothing collection bins and the Eco Fun stations that accept clothes.
- DSPA - Glass bottle public collection points: <https://www.dspa.gov.mo/richtext_recycle_glass_bottle.aspx?a_id=1569493659> - public glass bottle bins.
- DSPA - Light tube and bulb collection points: <https://www.dspa.gov.mo/richtext_lamp_recycling.aspx?a_id=1710390601> - collection points marked with the recycling logo.
- DSPA - Electronic and electrical equipment fixed collection network: <https://www.dspa.gov.mo/richtext3.aspx?a_id=1506052934> - fixed points for computers, communication equipment and home appliances.
- DSPA - Electronic and electrical equipment mobile collection network: <https://www.dspa.gov.mo/richtext3.aspx?a_id=1506052998> - mobile points for computers, communication equipment and small appliances.
- DSPA - Waste battery collection points: <https://www.dspa.gov.mo/richtext2.aspx?a_id=101412> - public waste battery collection points across Macau.
- DSPA - Eco Fun network co-ordinates: <https://www.dspa.gov.mo/ecofunweb/read_time.aspx?station=ALL> - official latitude and longitude for the Eco Fun stations, mobile truck, street stations, service points and community points. This is the public endpoint used by the DSPA map and is the only channel group with published coordinates.

Point lists change over time. The finder shows the capture date, links each channel to the official DSPA page, and keeps the source of every point. The dataset is a snapshot, not a live feed, and the finder does not claim that a specific point will accept a specific item.

The nearest-point search is limited to the Eco Fun network, because the other channels publish an address only. The app shows this limitation in the response's `coordinateNote` and in the UI instead of inventing coordinates or distances.

## Learning content

The current learning fact is generated from the supplied prompt and must not contain unsupported carbon or energy numbers. Add a named source and access date before adding quantitative environmental claims.

## Bin photos and attribution

The suggested-bin card shows the official Macau bin photos published by DSPA. The files are stored unmodified in `server/data/bin-images/` and served at `/api/bin-images/...`:

- `three-colour-bins.png` - the public three-colour recycling bins (metal, paper and plastic). Source: DSPA "Recycling in buildings" page, <https://www.dspa.gov.mo/richtext_buildings.aspx?a_id=1578363446>, obtained 2026-10-06. Shared by the plastic, metal and paper suggestions because Macau publishes one photo for the three-colour set.
- `glass-bin.png` - a public glass bottle bin (玻璃樽). Same DSPA page, obtained 2026-10-06.
- `battery-box.jpg` - the DSPA waste battery collection box. Source: DSPA "Waste battery collection scheme" page, <https://www.dspa.gov.mo/richtext2.aspx?a_id=101411>, obtained 2026-10-06.

The DSPA "Terms of Use and Privacy" page (<https://www.dspa.gov.mo/terms.aspx>) permits copying and republishing site content for non-commercial use provided the content is attributed to the Bureau, the date obtained is stated, and the content is not modified. The app shows the attribution and date next to each photo, the files are served unmodified, and the project is a non-commercial student entry. Confirm this reading with the teachers before any public release, and never use these photos commercially. Streams with no official DSPA bin photo (food waste, general waste) show text only rather than a substitute or foreign image.

## Images and privacy

Use anonymous, permission-cleared test images only. Do not commit personal photos or student information.
