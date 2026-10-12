'use client';
import { useEffect, useRef } from 'react';
import type { AssetInventory } from '@/config/architecturalLayers';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ScrollStage } from './ScrollStage';
export function ScrollExperience({assets}:{assets:AssetInventory}) {
  const root = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(()=>{
    if (reducedMotion || !root.current) return;
    let disposed = false;
    let cleanup: (()=>void) | undefined;
    import('@/lib/animation/createScrollTimeline').then(({createScrollTimeline})=>{
      if (!disposed && root.current) cleanup = createScrollTimeline(root.current, assets);
    }).catch(()=>{
      // The server-rendered sequential story is the functional failure state.
      root.current?.classList.remove('is-enhanced');
    });
    return ()=>{ disposed = true; cleanup?.(); };
  },[assets,reducedMotion]);
  return <section id="vision" ref={root} className="scroll-experience" aria-label="The architecture of an intelligent institution"><ScrollStage assets={assets}/></section>;
}
