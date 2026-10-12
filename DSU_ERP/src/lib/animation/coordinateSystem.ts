export const REFERENCE = { width: 1000, height: 800 } as const;
export interface Point { x: number; y: number }
export function fitReference(width: number, height: number) {
  const scale = Math.min(width / REFERENCE.width, height / REFERENCE.height);
  return { scale, x: (width - REFERENCE.width * scale) / 2, y: (height - REFERENCE.height * scale) / 2 };
}
export function translatedAnchor(anchor: Point, offset: Point, motionScale = 1): Point {
  return { x: anchor.x + offset.x * motionScale, y: anchor.y + offset.y * motionScale };
}
