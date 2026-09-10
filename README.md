# Brooktrails Township CSD 48-hour preview

Mobile-first redesign concept for the complete Brooktrails Township Community Services District website. The project expands the original Fire Department preview into a resident-centered district experience covering water and sewer, fire and emergency safety, parks and trails, planning, government, history, contacts, and public documents.

Preview: <https://ukiahcomputerworks.github.io/brooktrails-fire-preview/>

## What is included

- 10 primary redesigned pages and 28 legacy-route redirects
- 30 retained source pages represented in the route map and full text archive
- 51 locally retained public documents
- emergency-first public-safety treatment and direct 911 action
- searchable document center
- responsive layouts verified at 390 px and 1440 px
- `noindex`, `nofollow`, and `noarchive` on every preview page

## Build and validation

```powershell
node scripts/build-site.mjs
$env:NODE_PATH='C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node scripts/test-site.mjs
$env:SITE_BASE='https://ukiahcomputerworks.github.io/brooktrails-fire-preview'
node scripts/test-site.mjs
```

The source capture is intentionally excluded from Git because it is an 83 MB evidence snapshot. Public documents and selected first-party images needed by the preview are committed. See `SOURCE-INVENTORY.md`, `DESIGN-RESEARCH.md`, and `VISUAL-SYSTEM.md` for the migration and design rationale.

## Preview boundary

This is a temporary concept preview, not the official district website. Current official sources control changing information. No production domain, district account, emergency system, payment workflow, or public form is changed by this repository.
