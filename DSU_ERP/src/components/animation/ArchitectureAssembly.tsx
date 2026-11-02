'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { AssetInventory } from '@/config/architecturalLayers';
import { ArchitectureLayer } from './ArchitectureLayer';
import { TechnicalGuides } from './TechnicalGuides';
import { ConnectionOverlay } from './ConnectionOverlay';
function ReferenceDatum() {
  return <g className="reference-datum">
    <g fill="none" stroke="currentColor" strokeWidth=".85">
      <path d="M182 464 L478 293 L817 489 L521 660 Z" />
      <path d="M182 470 L521 666 L817 495 M521 660 V666 M182 464 V470 M817 489 V495" />
      <g opacity=".25">{Array.from({length: 9}, (_,i) => <path key={'a'+i} d={'M'+(212+i*30)+' '+(447-i*17.3)+' l339 196'}/>)}{Array.from({length: 10}, (_,i) => <path key={'b'+i} d={'M'+(215+i*30)+' '+(483+i*17.3)+' l296 -171'}/>)}</g>
      <path strokeDasharray="3 6" opacity=".65" d="M182 464 V314 L478 143 L817 339 V489 M182 314 L521 510 L817 339 M521 510 V660 M478 143 V293" />
      <path opacity=".35" d="M153 491 L492 687 M143 485 L163 497 M482 681 L502 693 M551 686 L847 515 M541 680 L561 692 M837 509 L857 521" />
      <path opacity=".5" d="M500 335 V420 M460 398 L540 352 M459 351 L541 399" />
    </g>
    <g fill="#F5CF1D">{[[182,464],[478,293],[817,489],[521,660],[500,375]].map(([x,y])=><rect key={x} x={x-2.5} y={y-2.5} width="5" height="5"/>)}</g>
    <text className="datum-monogram" x="500" y="295" textAnchor="middle">DSU</text>
    <text className="datum-title" x="500" y="722" textAnchor="middle">ARCHITECTURAL REFERENCE PENDING</text>
    <text className="datum-subtitle" x="500" y="744" textAnchor="middle">TEMPORARY REGISTRATION STUDY · NOT THE COLLEGE BUILDING</text>
  </g>;
}
export function ArchitectureAssembly({ assets }: { assets: AssetInventory }) {
  const [failed, setFailed] = useState(false);
  const placeholder = failed || assets.mode === 'placeholder';
  return <figure className="architecture-figure" data-asset-mode={failed ? 'placeholder' : assets.mode}>
    <div className="architecture-artwork" data-architecture-artwork style={{ aspectRatio: !placeholder && assets.mode === 'illustration' ? '510 / 760' : '1000 / 800' }}>
    <svg className="architecture-svg" viewBox={!placeholder && assets.mode === 'illustration' ? '245 20 510 760' : '0 0 1000 800'} role="img" aria-labelledby="architecture-title architecture-description">
      <title id="architecture-title">{placeholder ? 'Temporary DSU architectural registration study' : 'DSU college architectural illustration'}</title>
      <desc id="architecture-description">{placeholder ? 'A conceptual isometric reference plane. No college reference imagery has been provided; this is not a representation of the building.' : assets.mode === 'layered' ? 'Registered transparent architectural components share one isometric camera and separate along a vertical axis as you scroll.' : 'The supplied illustration is shown as one intact image. Independent architectural components are not being animated.'} Labels describe platform capabilities, not physical room locations.</desc>
      <g data-building-frame>
        {placeholder ? <ReferenceDatum/> : assets.mode === 'layered' ? <g onError={() => setFailed(true)}>{assets.layers.toSorted((a,b)=>a.order-b.order).map(layer=><ArchitectureLayer key={layer.id} layer={layer}/>)}<TechnicalGuides layers={assets.layers}/></g> : <foreignObject data-flat-illustration x="65" y="-70" width="870" height="875"><div className="flat-image-container"><Image src={assets.illustration!} alt="" fill preload sizes="(max-width: 767px) 100vw, 94vw" quality={85} style={{objectFit: 'contain'}} onError={() => setFailed(true)}/></div></foreignObject>}
      </g>
    </svg>
    </div>
    <svg className="architecture-annotations" viewBox="0 0 1000 800" aria-hidden="true"><ConnectionOverlay/></svg>
    <figcaption><span><i className="status-dot"/>{placeholder ? 'REFERENCE ASSETS PENDING' : assets.mode === 'layered' ? 'REGISTERED ARCHITECTURAL LAYERS' : 'DSU / EXPLODED AXONOMETRIC'}</span><span className="drawing-caption-right">{assets.mode === 'layered' ? 'ISOMETRIC / SHARED CAMERA' : 'CONCEPT / PHASE 01'}</span></figcaption>
    <p className="diagram-note">{placeholder ? 'Temporary study. The original DSU architecture will occupy this stage.' : assets.mode === 'illustration' ? 'Scroll to explore the architecture. Original illustration shown intact.' : 'Platform annotations are diagrammatic, not physical department locations.'}</p>
  </figure>;
}
