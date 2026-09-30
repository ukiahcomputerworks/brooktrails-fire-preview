# Source capture and migration inventory

Capture date: September 10, 2026

Source: <https://www.btcsd.org/>

Evidence root: `evidence/source-capture/2026-09-10-r2`

## Capture results

- 200 requested first-party records
- 180 successful responses
- 83,236,913 captured bytes
- all 30 sitemap HTML pages captured successfully
- 50 PDF files and 1 DOCX file captured
- 63 JPEG, 19 PNG, and 3 GIF image files captured
- 20 failed stale, malformed, rate-limited, or previously removed legacy references recorded in the manifest
- 298 external references retained for review

The extracted content dataset contains 30 pages, 78 headings, 1,614 links, 321 image references, zero forms, and 161,796 characters of rendered text. The repository retains 51 documents and selected first-party images. The district-facing guided library exposes 48 district documents; three Fire-only documents remain retained for the separate Fire website. The 30-route disposition table is generated as a separate reviewer deliverable, and the full rendered-text archive remains preserved.

The district-facing information architecture now contains 10 primary pages and 29 legacy or separated-section redirects. Six public navigation doors lead to a consolidated Resident Services hub, interactive Parks and civic dashboards, Discover, and Contact. Five Fire-related routes land in the retained archive while the dedicated Fire website is developed.

## Migration disposition

- `/` is redesigned as the district-wide resident homepage.
- Water and sewer content is consolidated under `/water/`.
- Fire Department source pages remain in `/archive/`; their public section and legacy routes are separated from this district preview while a dedicated Fire website is developed.
- Redwood Park, maps, recreation, and committee material are consolidated under `/parks/`.
- Development review and planning material is consolidated under `/planning/`.
- Board, administration, meetings, ordinances, enterprise systems, and employment are consolidated under `/government/`.
- District background and historical material is presented under `/history/` and preserved in `/archive/`.
- All captured downloadable records are searchable under `/resources/`.
- Existing public route slugs receive static redirects to their new destinations.

## Evidence and rights boundary

The raw recursive capture is evidence and is excluded from Git. Only assets required to render the preview are published. First-party district documents remain attributed through their source URLs and capture hashes. Public-map imagery and third-party historical reproductions require owner review or replacement before production use.
