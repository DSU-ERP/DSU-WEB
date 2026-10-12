export const HERO_MOTION = {
  expansionStart: 0.015,
  expansionEnd: 0.31,
  middle: 0.52,
  foundation: 0.77,
  returnStart: 0.82,
  returnEnd: 0.965,
} as const;

/** One camera move for the intact drawing. No raster slicing or invented layers. */
export function getHeroFraming(viewportHeight: number, artworkHeight: number, mobile: boolean, portrait: boolean, captionBottom = 0) {
  const openingScale = mobile ? 0.76 : 0.53;
  const expandedScale = mobile ? 1.06 : 1;
  // The narrowest headings wrap. Keep the dome below their reserved text band.
  const expandedY = mobile
    ? Math.max(viewportHeight * 0.23, captionBottom + 10 - artworkHeight * expandedScale * .04)
    : viewportHeight * 0.16;
  const travel = portrait ? Math.max(0, artworkHeight * expandedScale - (viewportHeight * 0.88 - expandedY)) : 0;
  return {
    opening: { scale: openingScale, y: viewportHeight * 0.31 },
    expanded: { scale: expandedScale, y: expandedY },
    middle: { scale: expandedScale, y: expandedY - travel * 0.48 },
    foundation: { scale: expandedScale, y: expandedY - travel },
    closing: { scale: mobile ? 0.8 : 0.53, y: viewportHeight * (mobile ? 0.31 : 0.28) },
  };
}
