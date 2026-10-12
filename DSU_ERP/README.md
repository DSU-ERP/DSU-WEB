# DSU Agentic ERP

A Next.js landing page that transitions from the ONE CAMPUS introduction into an ACCESS PORTAL composition as the visitor scrolls.

One GSAP ScrollTrigger timeline keeps the assembled college visible as it moves right, introduces a faint DSU seal, and reveals the portal copy and buttons on the left. Scrolling upward reverses the transition. There are no exploded views, ERP services, or authentication flows. The Vision link returns to the introduction.

## Run locally

Use Node.js 20.9+.

    npm ci
    npm run dev

Open http://localhost:3000.

    npm run build
    npm run start

## Editing

- src/app/page.tsx: asset selection and page entry point.
- src/components/animation/CampusPortal.tsx: hero/portal copy, button responses, and scroll timeline. MORPH controls transition pacing.
- src/app/static-campus.css: responsive opening and portal layouts and monochrome treatment.
- src/components/layout/Navbar.tsx: the brand and Vision link.
- src/components/animation/IllustrationView.tsx: static assembled illustration rendering.
- src/config/illustrationChapters.ts: source masks and fixed assembled positions reused by the static artwork.

The illustration is the existing assembled composition of the supplied landscape reference, including its dome and towers. It moves as one intact image. Original image files remain intact; black-and-white presentation uses CSS grayscale.

Previous exploded-journey components are retained as unused source files. The active animation lives only in CampusPortal. Only static-campus.css and the base globals are imported by the layout.

The design adapts to desktop and mobile. Reduced-motion and no-JavaScript visitors get sequential static content without pinning. Image-load errors have a text fallback. SIGN IN and LOG IN currently display a coming-soon message; replace those handlers when destination URLs are supplied.

The official seal comes from https://www.dsu.edu.in/images/logo_white.png, retained in public/assets/college/dsu-official-logo.png. CSS frames the circular portion of the university lockup without modifying it. This official mark differs in its lettering and shield details from the supplied mockup. See ASSETS.md for architectural source provenance.

## Validation

    npm run typecheck
    npm run build

See VALIDATION.md for verification notes.

