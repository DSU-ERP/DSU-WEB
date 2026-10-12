'use client';
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ILLUSTRATION_CHAPTERS, type DrawingSource } from '@/config/illustrationChapters';
import { CampusHeroSection } from '@/components/sections/architecture/CampusHeroSection';
import { UpperFloorSection } from '@/components/sections/architecture/UpperFloorSection';
import { LowerFloorSection } from '@/components/sections/architecture/LowerFloorSection';
import { FoundationSection } from '@/components/sections/architecture/FoundationSection';
import { FacadeSection } from '@/components/sections/architecture/FacadeSection';
import { RoofSection } from '@/components/sections/architecture/RoofSection';
import { ConnectedCampusSection } from '@/components/sections/architecture/ConnectedCampusSection';
import { IllustrationView } from './IllustrationView';
import { SystemMerge } from './SystemMerge';
export function IllustrationJourney({ src }: { src: DrawingSource }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !root.current) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    import('@/lib/animation/createIllustrationTimeline').then(({ createIllustrationTimeline }) => {
      if (!disposed && root.current) cleanup = createIllustrationTimeline(root.current);
    }).catch(() => root.current?.classList.remove('journey-enhanced'));
    return () => { disposed = true; cleanup?.(); };
  }, [reduced]);
  return <section id="vision" ref={root} className="architectural-journey" aria-label="Explore the college, one architectural layer at a time">
    <div className="journey-stage" data-journey-stage>
      <div className="journey-masthead" aria-hidden="true"><span>THE ARCHITECTURE OF INTELLIGENCE</span><span>DSU / AN INSTITUTION, CONNECTED</span></div>
      <div className="journey-visual" aria-hidden="true"><IllustrationView src={src} animated/></div>
      <div className="journey-sections"><CampusHeroSection src={src}/><FacadeSection src={src}/><UpperFloorSection src={src}/><LowerFloorSection src={src}/><FoundationSection src={src}/><RoofSection src={src}/><SystemMerge src={src}/><ConnectedCampusSection src={src}/></div>
      <div className="journey-navigation"><span className="journey-scroll-hint"><ArrowDown size={14}/> SCROLL TO EXPLORE</span><nav aria-label="Architectural chapters">{ILLUSTRATION_CHAPTERS.map((chapter, index) => <a key={chapter.id} href={'#' + chapter.id} data-chapter-link={index}><span>{index === 0 ? '00' : String(index).padStart(2, '0')}</span><span className="chapter-link-label">{chapter.label}</span><i/></a>)}</nav><a className="journey-skip" href="#platform">Skip to platform <ArrowUpRight size={13}/></a></div>
      <div className="journey-progress" aria-hidden="true"><span data-journey-progress/></div>
    </div>
    <p className="drawing-disclosure">Architectural details from the supplied illustration. Platform themes are conceptual, not physical room assignments.</p>
  </section>;
}
