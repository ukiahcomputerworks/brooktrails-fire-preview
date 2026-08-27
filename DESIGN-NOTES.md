# Brooktrails Fire Department public copy and design notes

## Purpose and content boundary

The homepage is organized as a resident-facing community resource. Emergency action comes first, followed by volunteer recruitment, department services, household preparedness, condensed burn guidance, and non-emergency station contacts. Changeable public-safety information links directly to the responsible agency.

## Regional design patterns used

Regional fire-service sites consistently prioritize emergency calling, evacuation information, volunteer recruitment, defensible space, alert enrollment, burn information, and clear station contacts. They also rely on real station or apparatus imagery, compact utility navigation, dark municipal framing, and red reserved for emergency actions. The Brooktrails page synthesizes those patterns while keeping its own visual identity and original copy.

The visual review included:

- Burlington Township Fire Department: <https://btfd.org/>
- Redwood Coast Fire Protection District: <https://www.rcfpd.net/>
- Hopland Fire Protection District: <https://www.hoplandfire.gov/>
- Redwood Valley-Calpella Fire District: <https://www.redwoodvalleycalpellafire.org/>
- Mendocino Volunteer Fire Department: <https://www.mendocinofire.com/>
- North Sonoma Coast Volunteer Firefighters Association: <https://tsrvfd.org/>

No copy was taken from those sites. The Brooktrails page uses verified local facts and official Mendocino County resource links.

## Local image provenance

The hero uses a public 2018 exterior image of the actual Brooktrails Fire Department station at 24860 Birch Street from the department's Google Maps listing. The crop removes the Maps interface and is stored locally as `assets/station-exterior.jpg`. It is used only in this temporary, `noindex` concept preview and should be replaced with a department-owned original before production use.

## Current resident resources

- Dated CAL FIRE status for Mendocino County: Burning Suspended, effective June 15, 2026 at 8:00 AM, verified August 27, 2026.
- Mendocino AQMD daily burn line: 707-463-4391.
- MendoReady access for active incidents, evacuation orders and warnings, shelters, road closures, evacuation zones, and alert enrollment.
- CAL FIRE status and permit access plus the AQMD daily burn line in one compact section.
- Ready for Wildfire defensible-space guidance.
- Current official station address, business phone, fax, and `fireprev@btcsd.org` email.

The live CAL FIRE status and daily AQMD determination always control whether burning is allowed.

## Accessibility and safety decisions

- Semantic landmarks, skip link, visible focus rings, one H1, descriptive link copy, and 48px touch targets.
- Mobile-first layout with explicit 390 px and 1440 px validation.
- Emergency actions call 911 directly; incident and evacuation actions route to MendoReady.
- Recruitment uses the department's published business phone and email.
- There are no fake forms, live-status simulations, or unverified apparatus and staffing claims.
- External links use `rel="noopener"`; changeable status links point back to official sources.

## Primary official sources

- Brooktrails CSD Fire Department: <https://www.btcsd.org/brooktrails-fire-department>
- CAL FIRE current residential burn status: <https://burnpermit.fire.ca.gov/current-burn-status>
- Mendocino AQMD burn information: <https://mcaqmd.org/burn-information/>
- MendoReady: <https://mendoready.org/>
- Ready for Wildfire: <https://www.readyforwildfire.org/prepare-for-wildfire/defensible-space/>
