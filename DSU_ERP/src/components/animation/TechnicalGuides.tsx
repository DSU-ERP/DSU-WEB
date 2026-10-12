import type { ArchitecturalLayer } from '@/config/architecturalLayers';
export function TechnicalGuides({ layers }: { layers: ArchitecturalLayer[] }) {
  if (!layers.length) return null;
  return <g data-technical-guides aria-hidden="true" className="technical-guides">
    {layers.slice(1).flatMap((upper, index) => upper.anchors.slice(0, 3).map(anchor => {
      const lower = layers[index];
      const target = lower.anchors.find(point => point.id === anchor.id);
      if (!target) return null;
      return <line key={upper.id + anchor.id} data-guide-upper={upper.id} data-guide-lower={lower.id} data-anchor={anchor.id} x1={anchor.x} x2={target.x} y1={anchor.y} y2={target.y} />;
    }))}
    {layers.map(layer => <g key={layer.id} data-registration-layer={layer.id}>{layer.anchors.slice(0, 2).map(anchor => <rect key={anchor.id} x={anchor.x - 2.5} y={anchor.y - 2.5} width="5" height="5" />)}</g>)}
  </g>;
}
