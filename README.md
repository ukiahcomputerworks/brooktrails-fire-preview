# Brooktrails Township CSD preview

Mobile-first redesign concept for the Brooktrails Township Community Services District website. The **Redwood Afterglow** revision turns the district experience into a modern field guide built from nocturnal forest depth, creek light, lantern wayfinding, and redwood landscape cues. It covers water and sewer, parks and trails, planning, government, history, contacts, and public documents. Fire Department information is being developed as a separate website.

Preview: <https://ukiahcomputerworks.github.io/BTFD-Preview/>

## What is included

- 11 primary redesigned pages and 29 legacy or separated-section redirects
- four non-overlapping information hubs plus two guided visitor journeys
- 30 retained source pages represented in the retained text archive and a separate reviewer deliverable
- 51 captured source-document records, with 47 district files in the public guided library, 3 Fire-only files held for the separate Fire website, and 1 identity-data form removed from the publishable preview
- universal 911 and county-alert utility links without a district Fire section
- interactive Parks, civic, and Discover dashboards with keyboard-operable detail cards
- guided document library with seven task-based shelves and full search
- a seven-step property approval path and a practical prospective-resident orientation
- intent-aware search with visible recovery when no quick suggestion matches
- atmospheric local imagery, tactile service markers, and restrained progressive motion
- responsive layouts verified at 390 px and 1440 px
- `noindex`, `nofollow`, and `noarchive` on every preview page

## Build and validation

```powershell
node scripts/build-site.mjs
$env:NODE_PATH='C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node scripts/test-site.mjs
$env:SITE_BASE='https://ukiahcomputerworks.github.io/BTFD-Preview'
node scripts/test-site.mjs
```

The source capture is intentionally excluded from Git because it is an 83 MB evidence snapshot. Public documents and selected first-party images needed by the preview are committed. See `SOURCE-INVENTORY.md`, `DESIGN-RESEARCH.md`, and `VISUAL-SYSTEM.md` for the migration and design rationale.

The reviewer migration handoff is generated separately at `deliverables/content-migration-review.html`. The proposal brief for Town Manager Tamara Alaniz is generated at `deliverables/town-manager-proposal.html`; it explains each architectural change, the reason for it, the guided journey flow, the privacy correction, and the production decision boundary.

## Preview boundary

This is a temporary concept preview, not the official district website. Current official sources control changing information. No production domain, district account, emergency system, payment workflow, or public form is changed by this repository.
