'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Eases mouse-wheel scrolling so scroll-driven scenes glide instead of jumping
 * in wheel-notch steps. Lenis runs on GSAP's ticker, so the scroll position and
 * the ScrollTrigger animations update on the same frame. Touch scrolling stays
 * native, and reduced-motion users keep normal scrolling. */
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
  return null;
}
