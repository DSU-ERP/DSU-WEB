# Validation — larger hero and individual details

## Latest revision — hero to access portal

- One reversible, scrubbed GSAP timeline translates/scales the same assembled artwork into a two-column portal layout. No exploded layers are animated.
- Production build (including TypeScript) passed.
- Desktop browser: checked opening, final portal, return to opening, and SIGN IN coming-soon feedback.
- Mobile 390 × 844: checked portal placement, lack of horizontal overflow, and final image alignment within one pixel of its responsive target.
- Reduced-motion uses GSAP matchMedia cleanup and sequential static content; behavior reviewed in source, system preference not changed during QA.
- Authentication destinations remain unspecified; buttons show coming-soon feedback.
- The locally stored seal is from the official DSU website; its details differ from the reference mockup.

Entries below describe earlier revisions.

## Latest revision — static hero only

- The active page now renders only the brand header, ONE CAMPUS heading, assembled monochrome university, and supporting caption. Journey, exploded sections, platform, impact, demo form, footer, chapter navigation and scroll prompts are no longer mounted.
- The page does not import either animation experience or a GSAP timeline. Static styles replace the journey stylesheet. All remaining links resolve to the main introduction.
- Production build and its TypeScript check passed.
- Browser checked at 1280 × 720 and 390 × 844: page height equals viewport height, no pinned stage, no extra content sections, and no mobile horizontal overflow.
- Captures: .qa/static-hero/desktop.png and mobile.png. Viewport overrides reset after testing.

All following entries describe earlier versions, not the current single-screen page.

## Current revision — new landscape artwork, roof and monochrome treatment

- Replaced the specialized journey's portrait source with the supplied 1672 × 941 landscape reference and validated its 2×/4× derivatives. The original file remains unchanged.
- Seven chapters now include separate facade, two interiors, foundation, and roof/dome sections. The five-part merge uses the same final offsets as the hero and closing view. Roof caps settle last.
- Removed white-paper overlap with SVG alpha compositing. All architectural images display with grayscale(1), including the merge, hero, individual sections and final composition. Red interface accents remain.
- TypeScript and 13 unit checks pass. The production build passes. The additional asset test rejects derivatives with dimensions belonging to the previous drawing.
- Desktop browser inspection at 1900 × 1000 covered the new interior, foundation, roof, and final views. The completed merge reaches the configured floor and roof-cap transforms exactly; the final view uses that same recipe.
- Screenshots for this revision are in .qa/grand-building/. The earlier sections below are historical validation of the previous portrait artwork.
- At 390 × 844, confirmed the final monochrome view, all image filters set to grayscale(1), no horizontal overflow, and no recorded browser errors. Temporary viewport overrides were reset.

This remains a masked 2D source-image composition. Baked-in guides and source perspective inconsistencies remain; no independently exported 3D layers are claimed.

## October 12 — larger and slower image merge

- The merge uses the available stage height, with the heading beside it on desktop and above it on smaller screens. Its shared SVG camera fits the measured container and recalculates on resize.
- The merge interval now has exactly twice its original scroll distance. Other chapter intervals retain their original pacing; chapter navigation and accessibility use the same remapping.
- TypeScript, all 12 unit checks, and the production build pass. The new timing check verifies doubled merge distance, unchanged surrounding intervals, and inverse progress mapping.
- At 1280 × 720, inspected separated layers, partial convergence, and the compact stack. Reverse scrolling to the same offset reproduced all three image translations exactly.
- Resizing to 1900 × 900 refreshed the camera to the larger diagram container. The heading and artwork stay separate and all three layers remain visible.
- At 390 × 844, verified the larger three-layer composition, no horizontal overflow, and the final chapter link revealing only the connected-campus panel. No browser runtime errors were recorded. Temporary viewport overrides were reset.
- Captures for this revision are in `.qa/larger-slower-merge/`.

## October 12 — actual architectural views merge

The user refined the request to use the three existing architectural image views. The symbolic polygons have been removed. The upper interior, lower interior, and foundation now use the same 2×/4× source and masks as their individual sections; they translate vertically into a compact stack, with a shared camera and unchanged proportions.

Current validation:

- TypeScript and all 11 unit checks pass. Production build passes.
- The current development server at port 3000 is reachable and serves three image-layer groups with no symbolic plane elements.
- At 1280 × 720, inspected the three separated architectural views, their intermediate overlap, the compact stack, and the final exterior reveal. Native scrolling advances through the sequence.
- Reversing native scroll from the final exterior to the same intermediate offset reproduced the three image translations exactly.
- At 390 × 844, inspected the three stacked source views. All three select the 1882px-wide image, and the page has no horizontal overflow.
- The final exterior and CTAs remain centered. The full four-part overview remains absent.
- Current captures are in `.qa/actual-layer-merge/`.

These are animated masked views of a flat image, not newly exported or verified 3D building components. Reduced-motion/no-JavaScript markup presents a static compact stack and legend.

## Earlier October 12 — symbolic transition (superseded)

- Added a reversible, scroll-controlled three-plane convergence immediately before the final college view. All symbolic planes converge to the same SVG coordinates; only the conceptual diagram moves independently.
- Three architectural details now use a common magnification and horizontal center. Final heading, illustration, support copy, and both CTAs use a centered composition.
- Production build and TypeScript passed; all 11 existing unit checks passed.
- The local preview at port 3000 continued to serve the preceding build. A fresh development server started successfully on port 3030, but the in-app browser could not connect to it. Current browser visual verification is therefore incomplete; the captures and browser results below describe the October 11 revision.
- Reduced-motion and no-JavaScript markup include a static unified diagram and the three-layer legend. Live reduced-motion switching has not been rechecked for this revision.

Restart the local server from this checkout with `npm run dev` to view the changes. For production preview, the updated build is ready for `npm run start`.

Updated October 11, 2026. Current browser checks use the Codex in-app browser against the running local development server. Earlier iteration checks are distinguished below.

## Build and checks

| Check | Result |
| --- | --- |
| Production Next.js build | Passed; static App Router page generated |
| TypeScript | Passed |
| Unit checks | 11 passed |
| Asset handling | Supported illustration mode; no independent layers claimed |
| Original PNG integrity | Original retained; source SHA-256 recorded in quality-manifest.json |
| Browser runtime errors | None observed in the current desktop journey |

The focused checks cover phase boundaries, registered layer timing and anchors, corrupt/missing images, unreviewed manifests, transparency requirements, the five-chapter view sequence, reading intervals, and responsive camera fitting.

The Next.js configuration uses native ESM (next.config.mjs), avoiding an unnecessary SWC TypeScript config-loading step that failed under the local filesystem restrictions. The application itself remains TypeScript.

## Current revision checks

- Inspected the enlarged complete exterior, first interior, second interior, and foundation at 1440 × 900. The dome and both wings remain visible.
- Confirmed five story sections and no combined exploded overview element. Each detail has its own semantic section and component.
- Desktop image requests select the 3764 × 6688 derivative. At 390 × 844 the browser selects the 1882 × 3344 derivative; no horizontal overflow. Inspected the mobile hero and first interior.
- Direct chapter links select the corresponding accessible section and illustration view. The lower interior stop contains only the lower view; the complete diagram is never used as a transition frame.
- Native PageDown advances from the first interior to the second. PageUp reverses that transition.
- The original source coordinates and aspect ratio remain unchanged. Derivatives are conventional interpolation with sharpening; they do not create native architectural detail.

Captures are under .qa/revision-oct11/: hero.png, first-layer.png, second-layer.png, foundation.png, mobile-hero.png, and mobile-first-layer.png.

## Previous iteration coverage

The preceding implementation was checked for reversible GSAP camera matrices, native wheel and emulated touch input, keyboard chapter navigation, pin release, mobile/tablet sizes, reduced-motion switching, JavaScript-disabled sequential content, and image-load errors. The current revision preserves those mechanisms, but the earlier six-section screenshots and exact progress values no longer describe this five-section sequence. Current image error handling observes the actual responsive images rather than downloading a separate probe.

The latest October 11 recording could not be played through the available review tools. Its accompanying screenshot and the user's explicit description supplied the evidence for removing the overview.

## Remaining limits

Actual transparent, registered DSU architectural exports and a matching assembled render have not been supplied. Genuine independent assemble/explode/reassemble motion is still unavailable. This implementation is a source-preserving camera and opacity tour. Registered Mode A remains behind the asset-validation gate.

Physical-device Safari and hardware trackpad testing remain outstanding. No backend demo submission, ERP service, authentication, or dashboard has been built.
