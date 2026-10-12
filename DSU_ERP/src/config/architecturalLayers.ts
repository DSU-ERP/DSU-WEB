import type { Point } from '../lib/animation/coordinateSystem';
export const LAYER_IDS = ['foundation', 'ground-floor', 'middle-floor', 'upper-floor', 'roof'] as const;
export type LayerId = typeof LAYER_IDS[number];
export interface AlignmentAnchor extends Point { id: string }
export interface ArchitecturalLayer {
  id: LayerId;
  name: string;
  src: string;
  order: number;
  assembled: Point;
  exploded: Point;
  transformOrigin: string;
  scale: number;
  opacity: number;
  explosion: { start: number; duration: number };
  reassembly: { start: number; duration: number };
  anchors: AlignmentAnchor[];
}
// All positions are in the SAME full-canvas reference space, never CSS pixels.
// These are choreography defaults. Enable only after artwork registration is reviewed.
export const ARCHITECTURAL_LAYERS: ArchitecturalLayer[] = [
  { id: 'foundation', name: 'Foundation', src: '/assets/college/foundation.png', order: 0, assembled: { x: 0, y: 0 }, exploded: { x: 0, y: 120 }, transformOrigin: '500 400', scale: 1, opacity: 1, explosion: { start: .25, duration: .15 }, reassembly: { start: .79, duration: .08 }, anchors: [] },
  { id: 'ground-floor', name: 'Ground floor', src: '/assets/college/ground-floor.png', order: 1, assembled: { x: 0, y: 0 }, exploded: { x: 0, y: 65 }, transformOrigin: '500 400', scale: 1, opacity: 1, explosion: { start: .23, duration: .16 }, reassembly: { start: .79, duration: .09 }, anchors: [] },
  { id: 'middle-floor', name: 'Middle floor', src: '/assets/college/middle-floor.png', order: 2, assembled: { x: 0, y: 0 }, exploded: { x: 0, y: -20 }, transformOrigin: '500 400', scale: 1, opacity: 1, explosion: { start: .205, duration: .17 }, reassembly: { start: .805, duration: .095 }, anchors: [] },
  { id: 'upper-floor', name: 'Upper floor', src: '/assets/college/upper-floor.png', order: 3, assembled: { x: 0, y: 0 }, exploded: { x: 0, y: -105 }, transformOrigin: '500 400', scale: 1, opacity: 1, explosion: { start: .18, duration: .18 }, reassembly: { start: .83, duration: .08 }, anchors: [] },
  { id: 'roof', name: 'Roof and central dome', src: '/assets/college/roof.png', order: 4, assembled: { x: 0, y: 0 }, exploded: { x: 0, y: -200 }, transformOrigin: '500 400', scale: 1, opacity: 1, explosion: { start: .16, duration: .19 }, reassembly: { start: .85, duration: .07 }, anchors: [] },
];
export type AssetMode = 'layered' | 'illustration' | 'placeholder';
export interface AssetInventory {
  mode: AssetMode;
  illustration: string | null;
  illustrationKind: 'assembled' | 'exploded' | null;
  enhancedIllustration?: { src: string; largeSrc: string };
  assembled: string | null;
  width: number;
  height: number;
  layers: ArchitecturalLayer[];
  issues: string[];
}
