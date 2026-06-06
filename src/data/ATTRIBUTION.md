# Port Dataset Attribution

The SeaRoute port dataset is curated from public maritime data sources. Every port carries an `id` (kebab-case slug, stable), an optional `unlocode` (UN/LOCODE), and basic physical data.

## Sources

### World Port Index (WPI)

- **Publisher**: National Geospatial-Intelligence Agency (NGA), Publication 150
- **License**: Public domain (US Government work, 17 U.S.C. § 105)
- **URL**: https://msi.nga.mil/Publications/WPI
- **Used for**: lat/lng, country, port size classification, basic physical data

### UN/LOCODE

- **Publisher**: United Nations Economic Commission for Europe (UNECE)
- **License**: Free for use with attribution
- **URL**: https://unece.org/trade/cefact/unlocode
- **Used for**: `unlocode` field (5-character location code) on each port

## Curation

The current `src/data/ports.ts` is a hand-curated seed covering the world's major and intermediate container, bulk, and tanker ports. Required fields (`id`, `name`, `country`, `countryCode`, `lat`, `lng`, `region`, `size`, `depths`) are populated for every port. Optional fields (`unlocode`, `maxVessel`, `restrictions`, `type`, `connections`) are populated where data is publicly available.

A future version will regenerate this file from the WPI + UN/LOCODE primary sources so the dataset can grow to cover the full 1,200+ port target from `PLAN.md`.

## License of derived work

This curated dataset is released under CC0 1.0 (public domain dedication) so the SeaRoute application can bundle and ship it without redistribution concerns.
