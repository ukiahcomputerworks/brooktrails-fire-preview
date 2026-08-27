# Brooktrails Fire Department concept preview

## Purpose and content boundary

This is a single-page concept preview prepared for owner discussion. It is not an official emergency source, does not display live alerts, and does not submit or store request-form data. Facts in public copy are limited to the supplied and independently verified official-source details. Personnel counts, apparatus specifications, ISO classification, and current operational status remain explicit content-to-confirm areas.

## Visual system

| Role | Implementation |
|---|---|
| Primary title | Georgia, weight 600, `clamp(2.8rem, 11vw, 5.8rem)`, line-height 1.08 |
| Section title | Georgia, weight 600, `clamp(2.25rem, 8vw, 4.25rem)`, line-height 1.08 |
| Subtitle/card title | System sans for operational modules; Georgia for narrative cards |
| Body | System sans stack, 1rem, line-height 1.65, muted text uses `--ink-soft` |
| Eyebrow | System sans, 900, uppercase, .16em tracking, ember or light gold |
| Word link | Forest text with gold 2px underline; ember hover treatment |
| Button | 48px minimum height, bold sans, filled, outline, emergency, and light variants |
| Navigation | Uppercase sans, high contrast, collapsed button below 960px |
| Card | 1.5rem radius, subtle border and shadow, semantic top accent line |
| Graphic | Original inline SVG shield and redwood/forest motifs; no external assets |
| Spacing | Shared shell max 76rem; section padding uses responsive clamps |
| Breakpoints | Mobile first; 608px, 960px, and 1216px enhancements; target checks at 390px and 1440px |

Palette: deep redwood greens for stability, ember red for emergency action, warm gold for preparedness and focus, and soft paper neutrals for legibility. The visual language pairs a civic shield with layered redwood silhouettes without reproducing an official mark.

## Route and component matrix

| Route | Title | Body | Links | Cards/effects | Graphics | 1440px | 390px |
|---|---|---|---|---|---|---|---|
| `/` | `.hero h1`, section `h2` tokens | Shared system sans | `.word-link`, `.button`, `.primary-nav` | Feature, emergency, snapshot, request, and notice components | Inline shield, canopy, volunteer forest | Required | Required |

Intentional exceptions: the hero title is white and uses the primary title scale; the emergency-strip heading uses a compact operational sans treatment; operational service titles use sans; narrative feature and request titles use the display serif.

## Content and workflow matrix

| Requirement | Page component |
|---|---|
| Emergency and alerts | Concept warning, emergency hero, quick actions, official-source strip |
| Evacuation | Evacuation preparedness card with Ready for Wildfire link |
| Burn permits | Permit card with May 2024 jurisdiction note and CAL FIRE link |
| Defensible space | Preparedness card with Ready for Wildfire link |
| Inspection and report requests | Accessible tabbed concept form with non-submit button |
| Volunteer recruitment | Dedicated volunteer call-to-action section |
| Public notices | Empty-state module that makes no current-status claim |
| Station contact | Address, emergency, business, email, and fax block |
| Services | Fire response, basic life support, rescue, and prevention modules |
| Personnel, apparatus, response area, ISO | Department snapshot with verified response area and content-to-confirm labels |
| Microsoft 365 workflow | Concept explanation plus three-step routing model |

## Accessibility and safety decisions

- Semantic landmarks, a skip link, visible focus rings, descriptive link copy, and keyboard-operable tabs are included.
- Buttons and navigation meet a 48px touch-target minimum.
- The request action is `type="button"`; the form submit event is also prevented in JavaScript.
- Live status is announced through `role="status"` and explicitly states that nothing was submitted or stored.
- Reduced-motion and print fallbacks are included.
- External links open in a new tab with `rel="noopener"`; emergency phone actions remain direct.
- No current incident, evacuation, burn-status, or public-notice claim is made.

## Official outbound sources

- Brooktrails CSD Fire Department: <https://www.btcsd.org/brooktrails-fire-department>
- Ready for Wildfire evacuation guide: <https://www.readyforwildfire.org/prepare-for-wildfire/go-evacuation-guide/>
- Ready for Wildfire defensible space: <https://www.readyforwildfire.org/prepare-for-wildfire/defensible-space/>
- CAL FIRE burn permits: <https://www.fire.ca.gov/burnpermit>
