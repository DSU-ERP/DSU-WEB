'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ILLUSTRATION_DETAILS, REFERENCE_SIZE, SYSTEM_LAYERS, ROOF_PARTS, illustrationFrame, type DrawingSource, type ViewId } from '@/config/illustrationChapters';
/** A masked window onto the original drawing; fullSource keeps its registration space. */
export function IllustrationView({ src, view = 'exterior', animated = false, fullSource = false }: { src: DrawingSource; view?: ViewId; animated?: boolean; fullSource?: boolean }) {
  const id = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // Inspect the already-selected responsive images; don't download another full
    // resolution image just to probe for an error that happened before hydration.
    const images = Array.from(svg.current?.querySelectorAll('img') ?? []);
    const onError = () => setFailed(true);
    images.forEach(image => {
      image.addEventListener('error', onError);
      if (image.complete && image.naturalWidth === 0) setFailed(true);
    });
    return () => images.forEach(image => image.removeEventListener('error', onError));
  }, [src]);
  const frame = illustrationFrame(view);
  if (failed) return fullSource
    ? <svg width={REFERENCE_SIZE.width} height={REFERENCE_SIZE.height} role="img" aria-label="College illustration unavailable"><text x={REFERENCE_SIZE.width / 2} y={frame.y + frame.height / 2} textAnchor="middle" className="merge-unavailable">[ ILLUSTRATION UNAVAILABLE ]</text></svg>
    : <div className="drawing-unavailable" role="img" aria-label="College illustration unavailable">[ COLLEGE ILLUSTRATION UNAVAILABLE ]</div>;
  const image = <foreignObject width={REFERENCE_SIZE.width} height={REFERENCE_SIZE.height}>
    <picture className="drawing-picture">
      {typeof src !== 'string' && <source media="(min-width: 1280px), (min-width: 768px) and (min-resolution: 1.5dppx)" srcSet={src.largeSrc}/>}
      {/* A picture inside SVG gives the browser native responsive source selection. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={typeof src === 'string' ? src : src.src} alt="" width={REFERENCE_SIZE.width} height={REFERENCE_SIZE.height} decoding="async" fetchPriority={animated || view === 'exterior' ? 'high' : 'auto'} onError={() => setFailed(true)}/>
    </picture>
  </foreignObject>;
  const roof = (assembled: boolean) => ROOF_PARTS.map(part => <g key={part.id} data-merge-roof-part={fullSource ? part.id : undefined} transform={`translate(${assembled ? part.x : 0} ${assembled ? part.y : 0})`}>
    <g clipPath={`url(#${id}-${part.id})`}><g clipPath={`url(#${id}-roof)`}><g filter={`url(#${id}-paper)`}>{image}</g></g></g>
  </g>);
  const drawing = (detail: ViewId) => detail === 'exterior'
    ? [...SYSTEM_LAYERS].reverse().map(layer => <g key={layer.id} transform={`translate(0 ${layer.assembledY})`}>{layer.id === 'roof' ? roof(true) : <g clipPath={'url(#' + id + '-' + layer.id + ')'}><g filter={`url(#${id}-paper)`}>{image}</g></g>}</g>)
    : detail === 'roof' ? roof(fullSource)
    : <g clipPath={'url(#' + id + '-' + detail + ')'}><g filter={`url(#${id}-paper)`}>{image}</g></g>;
  return <svg ref={svg} className={animated ? 'journey-canvas' : fullSource ? 'merge-source' : 'detail-drawing'} data-journey-canvas={animated || undefined}
    width={fullSource ? REFERENCE_SIZE.width : undefined} height={fullSource ? REFERENCE_SIZE.height : undefined}
    viewBox={animated ? '0 0 1440 900' : fullSource ? '0 0 ' + REFERENCE_SIZE.width + ' ' + REFERENCE_SIZE.height : [frame.x, frame.y, frame.width, frame.height].join(' ')}
    aria-hidden={animated || undefined} role={animated ? undefined : 'img'} aria-label={ILLUSTRATION_DETAILS[view].label}>
    <defs>
      {/* Remove only near-white paper when compositing; preserve RGB and opaque architecture. */}
      <filter id={id + '-paper'} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -20 -20 -20 0 58.5"/>
      </filter>
      {Object.entries(ILLUSTRATION_DETAILS).filter(([key]) => key !== 'exterior').map(([key, detail]) => <clipPath key={key} id={id + '-' + key}><polygon points={detail.mask}/></clipPath>)}
      {ROOF_PARTS.map(part => <clipPath key={part.id} id={id + '-' + part.id}><path d={part.path} clipRule="evenodd"/></clipPath>)}
    </defs>
    <g data-reference-camera={animated || undefined}>
      {animated ? Object.keys(ILLUSTRATION_DETAILS).map(key => <g key={key} data-drawing-detail={key} opacity={key === 'exterior' ? 1 : 0}>{drawing(key as ViewId)}</g>) : drawing(view)}
    </g>
  </svg>;
}
