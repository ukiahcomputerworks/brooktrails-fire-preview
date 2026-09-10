# Brooktrails visual system

## Brand roles

- Redwood green `#0B2C27`: primary civic identity, headers, footers, and landscape sections
- Evergreen `#185146`: links, section labels, and interactive emphasis
- Civic cream `#FFFAF1`: primary page field
- Warm paper `#F6F1E7`: supporting sections and document surfaces
- Wayfinding gold `#D6A84C`: resident actions, focus states, and key metrics
- Ember red `#A9342F`: fire and urgent preparedness content only

Georgia is the display face. The operating-system sans serif stack is used for navigation, body text, metadata, and forms. This keeps the preview dependency-free while preserving strong editorial contrast.

## Layout rules

- Base layout is single-column and touch-first.
- The first breakpoint at 38 rem introduces two-column cards and balanced section introductions.
- The main breakpoint at 64 rem introduces full navigation, service grids, and paired story/image layouts.
- Content uses a 76 rem maximum shell with fluid gutters.
- Interactive focus uses a 3 px gold outline.
- Reduced-motion preferences disable transitions and smooth scrolling.
- Print styling removes navigation and returns all content to high-contrast paper output.

## Reusable components

- emergency safety bar
- sticky district masthead and collapsible mobile navigation
- task-first quick action rail
- service cards with reserved emergency variant
- page hero with optional local image
- document search and download rows
- resource panels and contact directories
- route disposition table and retained source archive
- district footer with official-site fallback

The generated pages use one shared stylesheet and one small progressive-enhancement script. Core navigation and content remain usable without JavaScript.
