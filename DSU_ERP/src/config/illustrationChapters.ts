/** Frames and masks belong to the new landscape illustration, not independent 3D exports.
 * All geometry stays in ONE unchanged 1672 × 941 source coordinate system.
 * Masks follow the diagonal whitespace between parts; there are no raster slices.
 */
export type LayerViewId = 'roof' | 'facade' | 'upper' | 'lower' | 'foundation';
export type DetailId = 'exterior' | LayerViewId;
export type ViewId = DetailId;
export type DrawingSource = string | { src: string; largeSrc: string };
export interface DrawingFrame { x: number; y: number; width: number; height: number }
export const REFERENCE_SIZE = { width: 1672, height: 941 };
export const ILLUSTRATION_DETAILS: Record<DetailId, { label: string; frame: DrawingFrame; mask: string }> = {
  exterior: { label: 'University with its roof, central dome, towers, facade, interiors and foundation connected', frame: { x: 25, y: 280, width: 1625, height: 625 }, mask: '' },
  roof: { label: 'Roof, central dome and twin towers', frame: { x: 25, y: 40, width: 1625, height: 285 }, mask: '25,40 1650,40 1650,323 963,288 947,272 942,233 926,219 913,252 901,284 739,279 722,251 714,216 704,208 683,257 659,279 25,242' },
  facade: { label: 'The grand university facade', frame: { x: 25, y: 210, width: 1625, height: 325 }, mask: '25,244 659,279 683,257 704,208 714,216 722,251 739,279 901,284 913,252 926,219 942,233 947,272 963,288 1650,323 1650,530 942,490 924,467 662,440 643,467 25,433' },
  upper: { label: 'First exposed interior', frame: { x: 25, y: 435, width: 1625, height: 215 }, mask: '25,437 620,473 643,469 662,440 924,468 942,496 1080,508 1210,520 1400,535 1650,540 1650,647 1195,643 1187,633 1070,615 942,580 932,565 908,560 855,550 790,548 705,540 664,545 645,564 25,530' },
  lower: { label: 'Second exposed interior', frame: { x: 25, y: 540, width: 1625, height: 225 }, mask: '25,535 645,574 664,552 923,576 942,613 1080,625 1210,639 1400,650 1650,659 1650,762 1195,752 1187,743 1070,728 942,697 932,685 908,677 855,669 790,659 705,657 664,654 647,682 25,639' },
  foundation: { label: 'Foundation and structural base', frame: { x: 25, y: 650, width: 1625, height: 265 }, mask: '25,645 647,691 666,664 920,690 944,741 1080,753 1210,774 1400,780 1650,781 1672,935 0,935 0,725' },
};
export const ILLUSTRATION_CHAPTERS = [
  { id: 'campus', label: 'The campus', view: 'exterior', start: 0, settled: 0, leave: .10 },
  { id: 'facade-layer', label: 'Facade', view: 'facade', start: .135, settled: .175, leave: .235 },
  { id: 'first-layer', label: 'Upper', view: 'upper', start: .28, settled: .32, leave: .38 },
  { id: 'second-layer', label: 'Lower', view: 'lower', start: .425, settled: .465, leave: .525 },
  { id: 'foundation-layer', label: 'Foundation', view: 'foundation', start: .57, settled: .61, leave: .67 },
  { id: 'roof-layer', label: 'Roof & dome', view: 'roof', start: .71, settled: .75, leave: .78 },
  { id: 'connected-campus', label: 'Connected', view: 'exterior', start: .935, settled: .97, leave: 1 },
] as const;
/** A 2D convergence of all five source views, with the roof settling last. */
export const SYSTEM_MERGE = { start: .78, visible: .802, converge: .818, unified: .884, hold: .912, end: .945 } as const;
export const MERGE_DURATION_MULTIPLIER = 2;
export const JOURNEY_SCROLL_FACTOR = 1 + (SYSTEM_MERGE.end - SYSTEM_MERGE.start) * (MERGE_DURATION_MULTIPLIER - 1);
/** Keep the existing narrative coordinates while allocating twice the scroll to the merge. */
export function narrativeToScroll(progress: number) {
  const extra = Math.max(0, Math.min(progress, SYSTEM_MERGE.end) - SYSTEM_MERGE.start) * (MERGE_DURATION_MULTIPLIER - 1);
  return (progress + extra) / JOURNEY_SCROLL_FACTOR;
}
export function scrollToNarrative(progress: number) {
  const time = progress * JOURNEY_SCROLL_FACTOR;
  const mergeEnd = SYSTEM_MERGE.start + (SYSTEM_MERGE.end - SYSTEM_MERGE.start) * MERGE_DURATION_MULTIPLIER;
  if (time <= SYSTEM_MERGE.start) return time;
  if (time < mergeEnd) return SYSTEM_MERGE.start + (time - SYSTEM_MERGE.start) / MERGE_DURATION_MULTIPLIER;
  return time - (JOURNEY_SCROLL_FACTOR - 1);
}
export const SYSTEM_LAYERS = [
  { id: 'roof', number: '05', label: 'Roof & dome', assembledY: 250, delay: .035 },
  { id: 'facade', number: '01', label: 'Facade', assembledY: 205, delay: .012 },
  { id: 'upper', number: '02', label: 'Upper interior', assembledY: 145, delay: .006 },
  { id: 'lower', number: '03', label: 'Lower interior', assembledY: 75, delay: 0 },
  { id: 'foundation', number: '04', label: 'Foundation', assembledY: 0, delay: 0 },
] as const;
/** The source also lifts the dome and tower caps off the roof itself. Seat these
 * final roof details on their corresponding supports, without rotating/scaling. */
export const ROOF_PARTS = [
  { id: 'roof-plates', x: 0, y: 12, path: 'M0 0H1672V941H0Z M780 40H895V207H780Z M705 95H782V224H705Z M901 100H972V233H901Z M711 224L741 288H685Z M924 234L946 296H902Z' },
  { id: 'dome', x: -18, y: 30, path: 'M780 40H895V207H780Z' },
  { id: 'left-tower', x: -28, y: 10, path: 'M705 95H782V224H705Z' },
  { id: 'right-tower', x: -15, y: 28, path: 'M901 100H972V233H901Z' },
] as const;
// Offsets close the floor-to-floor seams in the supplied drawing. All views retain
// their x coordinate and scale. This remains 2D artwork, not surveyed 3D registration.
export const DETAIL_CHAPTER_INDICES = ILLUSTRATION_CHAPTERS.map((chapter, index) => chapter.view === 'exterior' ? -1 : index).filter(index => index >= 0);
export const MERGE_FRAMES = {
  exploded: { x: 25, y: 40, width: 1625, height: 875 },
  connected: ILLUSTRATION_DETAILS.exterior.frame,
  target: { x: 20, y: 20, width: 960, height: 960 },
} as const;
export function mergeCameraMatrix(state: 'exploded' | 'connected', target: DrawingFrame = MERGE_FRAMES.target) {
  const camera = fitDrawing(MERGE_FRAMES[state], target);
  return 'matrix(' + [camera.scale, 0, 0, camera.scale, camera.x, camera.y].join(',') + ')';
}
export function illustrationChapterAt(progress: number) {
  return Math.max(0, ILLUSTRATION_CHAPTERS.findLastIndex(chapter => progress >= chapter.start));
}
export function illustrationFrame(view: ViewId): DrawingFrame {
  return ILLUSTRATION_DETAILS[view].frame;
}
/** Fit without distortion; the target is measured between the actual text blocks. */
export function fitDrawing(frame: DrawingFrame, target: DrawingFrame) {
  const scale = Math.min(target.width / frame.width, target.height / frame.height);
  return { x: target.x + (target.width - frame.width * scale) / 2 - frame.x * scale,
    y: target.y + (target.height - frame.height * scale) / 2 - frame.y * scale, scale };
}
