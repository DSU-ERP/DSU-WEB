'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';

/** Pacing of the single scroll pull, as fractions of the pinned timeline. */
const PULL = { screens: 1.6, liftEnd: 0.3, moveStart: 0.1, moveDuration: 0.68, ringStart: 0.28, portalStart: 0.4, portalDuration: 0.3 };

/** The official seal with its lettering cut into the stone in sand. */
const CARVED_SEAL = '/assets/college/dsu-seal-carved.png';
/** Cut depths for the lettering filter, by heading size: about 120-148px,
 * 80-115px and under 80px. */
const CUTS = [
  { id: 'ln-cut-lg', blur: 6, depth: 8 },
  { id: 'ln-cut-md', blur: 4.5, depth: 9 },
  { id: 'ln-cut-sm', blur: 2.6, depth: 6 },
] as const;
/** The campus drawing etched as sand linework (derived from grand-exploded-reference). */
const ETCHING = { src: '/assets/landing/campus-etched-1x.webp', srcSet: '/assets/landing/campus-etched-1x.webp 1100w, /assets/landing/campus-etched-2x.webp 2200w' };

export function CampusPortal({ hasArtwork }: { hasArtwork: boolean }) {
  const stage = useRef<HTMLElement>(null);
  const inscription = useRef<HTMLElement>(null);
  const etching = useRef<HTMLElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const portal = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const root = stage.current!;
      const lead = inscription.current!;
      const art = etching.current!;
      const destination = target.current!;
      const copy = portal.current!;
      root.dataset.enhanced = 'true';
      gsap.set(copy, { autoAlpha: 0, y: 28 });
      gsap.set('.ln-ring', { autoAlpha: 0, scale: 0.9, rotate: -14 });
      copy.inert = true;

      // One pull drives everything: the inscription, the etching, the carved
      // ring, the portal and the light on the stone share this progress value.
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: () => `top ${document.querySelector('.ln-header')?.getBoundingClientRect().height ?? 76}px`,
          end: () => `+=${window.innerHeight * PULL.screens}`,
          pin: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          const progress = timeline.progress();
          copy.inert = progress < 0.62;
          lead.inert = progress > 0.2;
        },
      });
      timeline
        .to(lead, { autoAlpha: 0, y: -44, duration: PULL.liftEnd - 0.03, ease: 'power1.in' }, 0.03)
        // Etching and target share the stage as offset parent; layout offsets
        // ignore transforms, so the move stays exact after a resize refresh.
        .to(art, {
          x: () => destination.offsetLeft - art.offsetLeft,
          y: () => destination.offsetTop - art.offsetTop,
          scale: () => destination.offsetWidth / art.offsetWidth,
          duration: PULL.moveDuration, ease: 'power2.inOut',
        }, PULL.moveStart)
        .to('.ln-ring', { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.5, ease: 'power2.out' }, PULL.ringStart)
        .to(copy, { autoAlpha: 1, y: 0, duration: PULL.portalDuration, ease: 'power2.out' }, PULL.portalStart)
        .fromTo('.ln-sheen', { xPercent: -18 }, { xPercent: 22, duration: 1 }, 0);

      let active = true;
      void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
      return () => {
        active = false;
        delete root.dataset.enhanced;
        copy.inert = false;
        lead.inert = false;
      };
    }, stage);
    return () => media.revert();
  }, []);

  return <section className="ln-stage" ref={stage} aria-label="DSU Agentic ERP sign in">
    {/* V-cut lettering: the glyph's blurred alpha is the height map, so each
        stroke forms a ridge with two facets. Lit from below, the raised ridge
        reads as a cut lit from above. Lighting is blended with the fill
        (fill x (0.6 x light + 0.5)), so the shaded wall stays dark sand and
        the lit lip never clips. The blur is about half the stroke width
        at each heading size (see .ln-title / .ln-portal h2 in landing.css). */}
    <svg className="ln-defs" width="0" height="0" aria-hidden="true" focusable="false">
      {CUTS.map(cut => <filter key={cut.id} id={cut.id} x="-2%" y="-12%" width="104%" height="124%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation={cut.blur} result="height"/>
        <feDiffuseLighting in="height" surfaceScale={cut.depth} diffuseConstant="1.1" lightingColor="#ffffff" result="light">
          <feDistantLight azimuth="90" elevation="45"/>
        </feDiffuseLighting>
        <feComposite in="light" in2="SourceGraphic" operator="arithmetic" k1="0.6" k2="0" k3="0.5" k4="0" result="lit"/>
        <feComposite in="lit" in2="SourceAlpha" operator="in"/>
      </filter>)}
    </svg>

    <div className="ln-sheen" aria-hidden="true"/>

    <header className="ln-inscription" ref={inscription}>
      <span className="ln-roundel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CARVED_SEAL} alt="" width="828" height="828"/>
      </span>
      <h1 className="ln-title"><span>One</span> <span>campus.</span></h1>
      <p className="ln-tagline">Infinite possibilities.</p>
      <nav className="ln-actions" aria-label="Get started">
        <Link href="/login" className="ln-plate">Sign in <ArrowRight aria-hidden="true" size={17} strokeWidth={1.75}/></Link>
        <Link href="/sign-up" className="ln-plate ln-plate-ghost">Create account</Link>
      </nav>
    </header>

    <figure className="ln-etching" ref={etching}>
      {hasArtwork
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={ETCHING.src} srcSet={ETCHING.srcSet} sizes="(max-width: 767px) 136vw, min(74vw, 1100px)" alt="Etched drawing of the Dayananda Sagar University building: a domed central block between twin towers and long symmetrical wings" width="1100" height="423" fetchPriority="high" decoding="async"/>
        : <p className="ln-etching-missing">College illustration unavailable.</p>}
    </figure>

    <div className="ln-target" ref={target} aria-hidden="true"/>
    <div className="ln-ring" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CARVED_SEAL} alt="" width="828" height="828"/>
    </div>

    <section className="ln-portal" ref={portal} aria-labelledby="portal-title">
      <h2 id="portal-title"><span>Access</span> <span>portal.</span></h2>
      <p className="ln-portal-lede">Connect to your digital campus environment.</p>
      <div className="ln-actions">
        <Link href="/login" className="ln-plate">Sign in <ArrowRight aria-hidden="true" size={17} strokeWidth={1.75}/></Link>
        <Link href="/sign-up" className="ln-plate ln-plate-ghost">Create account</Link>
      </div>
      <p className="ln-portal-note">Recruiters join through the invitation link sent by the DSU placement office.</p>
    </section>
  </section>;
}
