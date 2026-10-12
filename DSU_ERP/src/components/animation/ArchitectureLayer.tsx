import type { ArchitecturalLayer } from '@/config/architecturalLayers';
export function ArchitectureLayer({ layer }: { layer: ArchitecturalLayer }) {
  return <g data-architecture-layer={layer.id} style={{ opacity: layer.opacity }}>
    <image href={layer.src} x="0" y="0" width="1000" height="800" preserveAspectRatio="xMidYMid meet" />
  </g>;
}
