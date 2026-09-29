# Brooktrails visual system: Redwood Afterglow

## Brand roles

- Redwood night `#06110F`: the immersive civic field and forest-depth background
- Canopy glass `rgba(10, 31, 27, 0.86)`: navigation, cards, and layered public-service surfaces
- Mist `#EAF2EC`: primary copy against the dark landscape
- Creek light `#6EDAD2`: links, water cues, and interactive energy
- Lantern gold `#F2C56B`: wayfinding, focus states, and resident-action rewards
- Fern `#75C78E`: landscape, parks, and positive status cues
- Ember `#FF735C`: the universal 911 indicator only
- Dusk violet `#A9A0FF`: planning, governance, and secondary civic depth

Trebuchet is the architectural display face: compact, modern, and strong enough for trail-marker headlines. Georgia appears selectively in the softer landscape phrasework. The operating-system sans serif stack remains the practical interface face for navigation, body text, metadata, and forms. The combination stays dependency-free while making the experience feel authored rather than templated.

## Experience idea

Redwood Afterglow treats the district website as a field guide after dusk: deep canopy layers, creek reflections, and lantern-like calls to action. The emotional reward comes from discovering a useful path quickly, without hiding public information behind spectacle.

- topographic linework and local landscape photography create depth without interfering with text
- clipped corners and trail-marker numbers turn routine cards into distinctive wayfinding objects
- each service route receives one accent color while retaining a single shared civic system
- restrained reveal and cursor-light effects reward exploration and disappear under reduced-motion preferences
- operational records, notices, and universal safety links remain plain, high contrast, and scannable

## Layout rules

- Base layout is single-column, touch-first, and safe at 320 px.
- The first breakpoint at 38 rem introduces two-column cards and balanced section introductions.
- The main breakpoint at 64 rem introduces full navigation, service grids, and paired story/image layouts.
- Content uses a 76 rem maximum shell with fluid gutters.
- Interactive focus uses a 3 px lantern-gold outline with offset.
- Reduced-motion preferences disable transitions and smooth scrolling.
- Print styling removes navigation and returns all content to high-contrast paper output.

## Reusable components

- universal 911 and county-alert utility bar
- sticky district masthead and collapsible mobile navigation
- task-first quick action rail
- numbered district-service cards with route accents
- page hero with optional local image
- document search and download rows
- resource panels and contact directories
- route disposition table and retained source archive
- district footer with official-site fallback

## Route and component matrix

| Route | Primary accent | Hero role | Main repeated component | Operational emphasis |
|---|---|---|---|---|
| Home | Creek + lantern | Cinematic district field guide | Five numbered trail cards | Safety utility strip + resident task rail |
| Water | Creek | Service orientation | Resource panels and notices | Billing, quality, conservation |
| Parks | Fern | Outdoor access | Amenity and policy panels | Current rules and reservations |
| Planning | Dusk violet | Project pathway | Process steps | Permits and district confirmation |
| Government | Lantern | Civic transparency | Meeting and governance panels | Agendas, minutes, board information |
| Resources | Creek | Public record library | Searchable download rows | Clear file metadata and provenance |
| Archive | Creek | Migration evidence | Expandable retained source text | Fire material retained without a district Fire section |
| Contact | Lantern | Human help | Contact directory | Phone, office, and official-site fallback |
| History | Fern | Place narrative | Story panels | Rights-aware archival context |
| Accessibility / 404 | Creek | Recovery and access | Plain action links | Fast return to a valid destination |

The generated pages use one shared stylesheet and one small progressive-enhancement script. Core navigation and content remain usable without JavaScript; hover light, reveal motion, and mobile navigation are enhancements rather than content dependencies.
