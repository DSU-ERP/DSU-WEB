# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students of Dayananda Sagar University** preparing for placements: AI interview practice, the Haki intelligence chat, competency work, drives and rankings. New students create an account at `/sign-up`; a student account requires an operator-linked official record.
- **Placement officers** running drives, companies, categories, student rankings and the Friday assistant from `/placement`.
- **Recruiters (company users)** working drive requests in the company portal. They join only through an invitation link emailed by the placement office (`/join/company?token=…`).
- **Administrators** managing agent workflows from `/admin`.

## Product Purpose

DSU Agentic ERP is the university's connected campus system for placement preparation and placement operations. One sign-in routes every account to the workspace its role allows (`/login` → `/workspace`).

## Positioning

Built for one institution, DSU, rather than sold as a generic campus product: the campus itself (the architectural drawing of the university building and the official seal) is the identity.

## Operating Context

- The landing page (`/`) is a **pure sign-in gateway**, not a marketing page: a hero, the campus, and the routes into sign-in. No feature sections (confirmed 2026-11-19).
- The site is not indexed (`robots: noindex`); visitors arrive from the university, the placement office, or invitation emails.
- Hosted on Render as a Next.js 16 / React 19 web service; data passes through DSU-Backend; Supabase provides authentication.

## Capabilities and Constraints

- Entry routes: `/login` (all roles), `/sign-up` (new students), `/forgot-password`, `/join/company?token=…` (invited recruiters only).
- The landing page must keep: the campus illustration, the "ONE CAMPUS. / INFINITE POSSIBILITIES." line, the pinned scroll morph into the access portal, and the official DSU seal (confirmed 2026-11-19).
- Redesign scope is the landing page only; sign-in, sign-up and the role portals keep their current look (confirmed 2026-11-19).
- Motion uses GSAP ScrollTrigger and Lenis; reduced-motion visitors get a static layout.

## Brand Commitments

- Official Dayananda Sagar University logo and seal (`public/assets/college/dsu-official-logo*.png`, `dsu-seal-crest.png`) are used unaltered in form. The landing page may re-tone the seal (for example, sand lettering on charcoal in `dsu-seal-carved.png`) but never redraws it; the header always carries the official lockup in its own colours.
- Landing page palette is pinned by the owner: **charcoal and sand** (2026-11-19).
- Product name: "DSU Agentic ERP".

## Evidence on Hand

- Architectural illustration of the DSU building: `public/assets/college/grand-exploded-reference.png` (+ 2x/4x WebP).
- No testimonials, statistics, customer logos or press exist; none may be invented.

## Product Principles

1. The front door gets people to their workspace; everything on it serves sign-in.
2. The campus is the identity: the real building and seal, not generic education imagery.
3. Claims stay true: no invented numbers, features or endorsements.

## Accessibility & Inclusion

Keyboard access, a skip link, visible focus and a reduced-motion path are existing commitments to preserve.
