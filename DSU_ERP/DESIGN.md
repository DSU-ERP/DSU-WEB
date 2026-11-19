---
name: DSU Agentic ERP — Landing
description: The campus dedication stone. Charcoal granite, sand-gilt lettering cut into it. Governs the landing page (/) only.
colors:
  stone: "#191918"
  stone-deep: "#121211"
  sand: "#D4BF96"
  sand-hi: "#ECDFC1"
  sand-low: "#AB9772"
  rule: "rgb(212 191 150 / 0.18)"
  rule-strong: "rgb(212 191 150 / 0.5)"
  sand-wash: "rgb(212 191 150 / 0.07)"
typography:
  display:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "clamp(48px, min(9.6vw, 15.2svh), 148px)"
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "clamp(44px, min(6.6vw, 11svh), 112px)"
    fontWeight: 500
    lineHeight: 0.94
    letterSpacing: "0.05em"
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "clamp(12px, 1.2vw, 17px)"
    fontWeight: 500
    letterSpacing: "0.44em"
    fontVariation: "'wdth' 125"
  body:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "clamp(15px, 1.3vw, 19px)"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 100"
  body-small:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.16em"
    fontVariation: "'wdth' 118"
  label-header:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.18em"
    fontVariation: "'wdth' 115"
  label-product:
    fontFamily: "Archivo, 'Arial Narrow', Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "30px"
    letterSpacing: "0.26em"
    fontVariation: "'wdth' 118"
rounded:
  none: "0px"
  seal: "50%"
spacing:
  gutter: "clamp(20px, 4.4vw, 64px)"
  gutter-phone: "22px"
  header-height: "76px"
  header-height-phone: "64px"
  actions-gap: "12px"
  header-gap: "24px"
  portal-block: "clamp(56px, 9vw, 112px)"
components:
  plate-primary:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.stone}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px 0 26px"
    height: "clamp(48px, 6.4svh, 56px)"
  plate-primary-hover:
    backgroundColor: "{colors.sand-hi}"
    textColor: "{colors.stone}"
  plate-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.sand}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px 0 26px"
    height: "clamp(48px, 6.4svh, 56px)"
  plate-ghost-hover:
    backgroundColor: "{colors.sand-wash}"
    textColor: "{colors.sand-hi}"
  header-link:
    backgroundColor: "transparent"
    textColor: "{colors.sand}"
    typography: "{typography.label-header}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "40px"
  header-link-hover:
    backgroundColor: "{colors.sand-wash}"
    textColor: "{colors.sand-hi}"
  header:
    backgroundColor: "{colors.stone-deep}"
    height: "{spacing.header-height}"
    padding: "0 clamp(20px, 4.4vw, 64px)"
  roundel:
    backgroundColor: "rgb(0 0 0 / 0.28)"
    rounded: "{rounded.seal}"
    size: "clamp(72px, 12.5svh, 124px)"
---

# Design System: DSU Agentic ERP — Landing

## Overview

**Creative North Star: "The Dedication Stone"**

The landing page is the campus's own foundation stone: a slab of polished charcoal granite with sand-gilt lettering cut into it. Everything on the page is either stone, something carved into the stone, or light moving across its polish. The university's real seal and the real building drawing are the identity; they are carved and etched, never pictured as photographs or set on cards.

Density is monumental and sparse: one centred axis, plaque-scale capitals, one line of tracked secondary lettering, two plates. Depth comes from cutting into the surface (incised lettering, a recessed seal socket, an etched drawing that sinks into the ground plane), not from stacking panels above it. Motion is one linked scroll pull that moves the inscription, the building, the carved ring, the portal and the light together.

**Scope.** This world governs the landing surface (route `/`: `src/app/page.tsx`, `CampusPortal`, `Navbar`, `src/app/landing.css`) and nothing else. Every rule is scoped under the `.ln` root. Sign-in, sign-up and the role portals are out of scope and unchanged: they keep their pre-existing Geist-on-light look and their own tokens in `src/app/globals.css` and `src/app/workspace.css`, which this document does not describe and does not govern.

**Key Characteristics:**
- Charcoal granite ground, sand as the single ink; the owner pinned the palette as charcoal and sand.
- Wide Archivo capitals tracked like plaque lettering, with an incised V-cut edge on headings.
- Square corners everywhere except the circle of the seal.
- Depth by carving (inset socket, cut lettering, masked etching), plus one soft drop under the primary plate.
- One pinned scroll pull drives every moving part; reduced motion gets a complete static layout.

## Colors

Two stones and one sand, with sand stepped down for secondary lines and thinned to alpha for rules.

### Primary
- **Sand Gilt** (`sand`): the only ink. Headings, body copy, the primary plate's fill, the etched building's linework, the carved seal's lettering and the granite's sparse glints are all this one colour.
- **Polished Sand** (`sand-hi`): the brightest sand. As a fill it belongs only to the primary plate's hover; elsewhere it appears as hover text on the ghost plate and header link, as the focus outline on every link, and at 2-4% alpha in the slab's light pools.

### Secondary
- **Worn Sand** (`sand-low`): secondary lettering: the tracked tagline, the header's product label, the portal note, the missing-artwork fallback.

### Neutral
- **Charcoal Granite** (`stone`): the page ground, always carried by the granite tile (`/assets/landing/granite-charcoal.webp`, a procedural seamless tile shown at 512px, 384px on phones). Also the text colour on the sand plate and the selection text.
- **Deep Stone** (`stone-deep`): the sticky header band and the canvas outside the page (overscroll).
- **Hairline Gilt** (`rule`): 1px rules: the header's bottom edge, the portal's top edge, the rule above the portal note.
- **Strong Gilt Line** (`rule-strong`): 1px borders on interactive outlines (ghost plate, header link) and the divider between logo and product label.
- **Gilt Wash** (`sand-wash`): the hover fill of outlined controls.

### Named Rules
**The One Ink Rule.** Sand is the only ink on the stone. The sole other colour on the surface is the official DSU logo lockup in the header, used unaltered. Warm-white highlights inside shadows and the sheen are light on the material, not ink, and stay at low alpha.

**The Brightest Plate Rule.** The only solid fill of polished sand (`sand-hi`) is the primary plate on hover. No other surface is filled brighter than `sand`.

## Typography

**Display Font:** Archivo variable (weight and `wdth` axes), self-hosted via `next/font/google` as `--font-archivo` (with 'Arial Narrow', Arial, sans-serif)
**Body Font:** the same Archivo at normal width (`wdth` 100)

**Character:** A single grotesque stretched wide (115-125% width) and set in capitals with generous tracking, so it reads as letter-cut plaque type; running copy drops back to normal width for legibility. `font-synthesis: none` is set on the root.

### Hierarchy
- **Display** (500, `wdth` 118, uppercase, plaque tracking): "ONE CAMPUS." One line from 768px up (`nowrap`); on phones each word sits on its own line at `min(15vw, 8.6svh)`. Carries the incised cut filter.
- **Headline** (500, `wdth` 118, uppercase): "ACCESS PORTAL.", always two stacked words; phones `min(15vw, 8.4svh)`. Incised.
- **Title** (500, `wdth` 125, uppercase, 0.44em tracking, Worn Sand): the single tagline under the display. A left padding equal to the tracking re-centres it on the axis; on phones 11px / 0.36em.
- **Body** (400, normal width): the portal lede, max 34ch.
- **Body small** (400, normal width, Worn Sand): the portal note, max 44ch.
- **Label** (600, wide, uppercase, tracked): plates 13px / 0.16em (phones 11.5px / 0.12em; 11px at 380px and below); header link 12px / 0.18em (phones 11px / 0.16em); header product label 11px / 0.26em.

### Named Rules
**The Incised Lettering Rule.** Display and headline lettering is cut into the stone with an SVG V-cut filter: the glyph's blurred alpha is the height map, lit by `feDiffuseLighting` (distant light, azimuth 90, elevation 45) and blended with the fill as fill × (0.6 × light + 0.5), so walls stay dark sand and the lit lip never clips. Cut depth follows size: `ln-cut-lg` (blur 6, depth 8) for 120-148px, `ln-cut-md` (4.5, 9) for 80-115px, `ln-cut-sm` (2.6, 6) under 80px. Below 1200px the display steps to `md` and the headline to `sm`; on phones both use `sm`. Body and labels are never cut.

**The Plaque Width Rule.** Capitals are set wide (`wdth` 115-125) and tracked; running sentences return to `wdth` 100.

## Layout

A single centred axis on a full-height stone stage (`max(560px, 100svh − header)`). The inscription (roundel, display, tagline, plates) fills the stone above the building and centres vertically in it, so the space above and below stays balanced at any height. The etched building is anchored to the stage's bottom edge at `min(74vw, 1100px, 1.1 × stage height)` (136vw on phones, cropping the wings), and its ground plane fades into the stone through a mask (opaque to 80%, clear by 99%).

Horizontal margins are one fluid gutter (`spacing.gutter`, 22px on phones). Vertical rhythm between the inscription's parts uses `svh`-based clamps (16-32px before the display, 12-24px before the tagline, 22-44px before the plates) so the composition compresses with short viewports rather than overflowing.

**Pinned pull (motion allowed).** The stage pins below the header for 1.6 screens of scroll (scrub 0.65). The inscription lifts and fades; the etching travels and scales into a landing box inside a carved seal ring; the ring fades in, scaling from 0.9 and rotating from −14°; the portal copy rises on the left (`min(44%, 640px)` wide); the sheen sweeps across the polish on the same progress. Desktop ring: `min(50vw, 88svh, 820px)` centred at 71% / 52%, with the building landing at 0.68 of the ring's diameter so its corners stay inside the lettered band. Phones: ring `min(104vw, 50svh)` centred at 50% / 73%, building at 0.86, portal copy pinned to the top. The inscription goes inert past 20% progress and the portal becomes interactive past 62%.

**Static layout (reduced motion).** Two rows: the stone with the inscription and building, then the portal below a hairline rule. At 768px and up the carved ring sits to the right of the portal at `min(36vw, 460px)`; below that it is hidden.

**Breakpoints:** 1199px (heading cut depths step down), 860px (header product label hidden), 767px (phone layout: header 64px, gutter 22px, stacked display, phone ring geometry, 384px granite tile), 380px (tighter plates), 340px (plates stack full width).

## Elevation & Depth

Depth is carved, not stacked. Surfaces sit flush in the stone and read as cut into it: the seal roundel is a recessed socket with a shadowed upper wall and a lit lower lip; lettering is incised by filter; the building is etched linework that sinks into the ground. The only raised object is the primary plate, a gilt plate with a bevel and one soft, low drop. Light is a moving soft-light sheen (a top pool plus a diagonal band of warm white) that crosses the polish with the scroll pull, over a slab of three faint radial light and shade pools that keep the tile from reading as a repeat.

### Shadow Vocabulary
- **Carved socket** (`box-shadow: inset 0 4px 9px rgb(0 0 0 / 0.8), inset 0 -1px 0 rgb(255 244 220 / 0.16), 0 1px 0 rgb(255 244 220 / 0.07), 0 -1px 0 rgb(0 0 0 / 0.5)` on `rgb(0 0 0 / 0.28)`): the seal roundel; the seal itself carries `drop-shadow(0 -1px 0 rgb(0 0 0 / 0.7))`.
- **Gilt plate** (`box-shadow: inset 0 1px 0 rgb(255 250 236 / 0.5), inset 0 -1px 0 rgb(60 48 28 / 0.35), 0 14px 28px -16px rgb(0 0 0 / 0.75)`): the primary plate only; the ghost plate has none.

### Named Rules
**The Cut Not Card Rule.** Nothing floats on the stone in a panel. New elements are carved in (inset, incised, etched) or are plates; there are no cards, blurred glass or raised containers.

## Shapes

Square-cornered throughout (`rounded.none`): plates, header link, rules and the header band have hard 90° corners. The single curve in the world is the circle of the seal, used twice: the small carved roundel above the title and the giant carved ring the building lands in. Borders are 1px gilt hairlines. The etching is clipped by masks, not boxes; the landed ring's inner field is masked clear (transparent to 70%, opaque from 73.5% of the radius) so only the lettered band frames the building, and on phones only its lower arc is kept.

## Components

### Buttons (gilt plates)
Square gilt plates, like brass name plates fixed to the stone.
- **Shape:** square corners (`rounded.none`), height `clamp(48px, 6.4svh, 56px)`, min width 172px.
- **Primary:** sand fill, stone label, a trailing 17px arrow pushed to the far edge (`justify-content: space-between`, 24px gap); gilt plate shadow.
- **Hover / Focus / Active:** fill brightens to `sand-hi` (0.25s ease) and the arrow slides 4px right (0.3s, `cubic-bezier(0.22, 1, 0.36, 1)`); press nudges down 1px; focus is a 2px `sand-hi` outline offset 4px.
- **Ghost:** transparent with a 1px `rule-strong` border, sand label, centred, no arrow, no shadow; hover adds the gilt wash, a full-sand border and `sand-hi` text.
- **Pairing:** always primary "Sign in" then ghost "Create account", 12px apart. On phones they share the row (max 400px); at 340px and below they stack full width.

### Navigation (header)
- **Band:** sticky, 76px (64px on phones), deep stone with a hairline gilt bottom rule.
- **Brand:** the official DSU light logo lockup, unaltered, 42px tall (34px on phones), then the product label "Agentic ERP" in Worn Sand behind a strong gilt divider; the label hides at 860px and below.
- **Action:** one outlined "Sign in" link with a 15px arrow; hover brightens border to sand, adds the gilt wash and `sand-hi` text, and nudges the arrow 3px.

### Seal Roundel (signature)
The official seal re-toned as carved sand lettering (`/assets/college/dsu-seal-carved.png`), set at 90% inside a circular carved socket, `clamp(72px, 12.5svh, 124px)` (`clamp(64px, 10svh, 92px)` on phones). It heads the centred axis.

### Etched Campus (signature)
The university building drawing rendered as sand linework only, no tone (`/assets/landing/campus-etched-1x.webp` / `-2x.webp`), so the granite shows between the lines. On entrance it is revealed bottom-up (`clip-path` 1.6s, 0.3s delay). If the artwork check fails, a tracked Worn Sand line ("College illustration unavailable.") stands in its place.

### Carved Seal Ring (signature)
The same carved seal at giant scale and 36% opacity, masked so its inner field is clear. It exists to receive the building at the end of the pull, or to sit beside the portal in the static layout.

### Entrance motion
The inscription surfaces once on load: each part rises 18px and fades in (`ln-surface`, 1-1.1s, `cubic-bezier(0.22, 1, 0.36, 1)`), staggered roundel 0.05s, title 0.15s, tagline 0.28s, plates 0.38s. Only under `prefers-reduced-motion: no-preference`.

## Do's and Don'ts

### Do:
- **Do** set every element on the granite stone (`stone` plus the granite tile) and ink it in sand; step down to `sand-low` for secondary lines.
- **Do** cut display and headline lettering with the matching `ln-cut-*` filter for its size; the filter definitions live in `CampusPortal`, so any heading that uses them must render alongside those definitions.
- **Do** keep plates and controls square, outlined or filled in sand, with a 1px `rule-strong` edge on outlined ones.
- **Do** use the official seal and building as carved and etched material, from the provenance-tagged rasters.
- **Do** tie any new scroll motion to the single pinned pull's progress, and give reduced-motion visitors a complete static layout.
- **Do** keep a 2px `sand-hi` focus outline, offset 4px, on every link.

### Don't:
- **Don't** introduce a second ink colour; the official logo lockup in the header is the only exception.
- **Don't** fill anything with `sand-hi` except the primary plate on hover.
- **Don't** round rectangular corners; the only curve is the seal's circle.
- **Don't** put content on cards, glass or raised panels; carve it in instead.
- **Don't** extend this world's tokens or `.ln` styles to sign-in, sign-up or the role portals; they keep their own look.
