# Architectural assets

## Active reference

Source: C:/Users/shrey/Downloads/Exploded View of a Grand Neoclassical Building.png.

| File in public/assets/college/ | Dimensions | Purpose |
| --- | --- | --- |
| grand-exploded-reference.png | 1672 × 941 | Unmodified supplied original |
| grand-exploded-reference-2x.webp | 3344 × 1882 | Responsive derivative, 1,267,390 bytes |
| grand-exploded-reference-4x.webp | 6688 × 3764 | Desktop derivative, 2,677,284 bytes |
| grand-exploded-reference-quality.json | — | Source hash and processing details |

Source SHA-256: 1d63be95dcd2df15100e515cf0a1ce16ae5d830d86921b129ceb85a750cffa96.

The five depicted parts are roof/dome/towers, facade, upper interior, lower interior, and foundation. The existing Lanczos3 upscale and sharpening workflow produces quality-96 WebP derivatives without generating new detail. The shared renderer displays every view in black and white, preserving the original color files.

## Compositing limits

SVG polygons isolate the depicted parts in the original 1672 × 941 space. Floors move vertically with one shared scale and unchanged horizontal positions. Roof plates, dome and tower caps have small final seating offsets because they are already separated in the reference.

SVG alpha filtering removes near-white paper around the parts. Very pale details may become partly transparent. Baked-in guides, shadows and source perspective inconsistencies remain. This is illustrative 2D compositing, not verified physical registration.

Hero, completed merge and closing view share the same assembly recipe. No new raster slices or generated architecture are shipped. These are not independently exported components and do not enable Mode A.

## Retained material

The earlier exploded-reference.png (941 × 1672), its derivatives and quality manifest remain. If the new reference is missing, the old image can still be displayed by the general fallback without incompatible landscape masks.

Earlier recordings informed the scroll choreography and individual sections. No video is shipped. No separate original photograph has been supplied.

## Genuine registered Mode A

Still needed: transparent roof.png, upper-floor.png, middle-floor.png, ground-floor.png, foundation.png, and matching assembled.png exported from a common scene or layered master.

Use one 1000 × 800 reference space, ideally 3000 × 2400 pixels or larger. Every export must share the same complete canvas, camera, proportions, shading and line weight, assembling at x=0, y=0 without duplicate architecture or seams.

When exports are ready, copy manifest.example.json to manifest.json. Provide at least two shared anchors per component, matching horizontal positions and reviewed exploded offsets. Set registrationReviewed to true only after visually reviewing the actual composition, then run npm run assets:validate -- --require-layers and rebuild.

The validator checks file readability, transparency, dimensions, filenames, components, anchors and movement bounds. It cannot certify architectural fidelity from image headers.

A verified DSU contact or booking destination is still needed for real demo submissions. The current form only downloads a local brief.

