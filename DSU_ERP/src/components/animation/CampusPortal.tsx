'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { IllustrationView } from './IllustrationView';
import type { DrawingSource } from '@/config/illustrationChapters';

const MORPH = { scrollScreens: 1.6, moveStart: 0.12, moveDuration: 0.66, textStart: 0.38, textDuration: 0.32 };

export function CampusPortal({ src }: { src: DrawingSource | null }) {
  const stage = useRef<HTMLElement>(null);
  const artwork = useRef<HTMLElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const portal = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const root = stage.current!;
      const art = artwork.current!;
      const destination = target.current!;
      const copy = portal.current!;
      root.dataset.enhanced = 'true';
      // Both elements share the stage as their offset parent. These layout
      // coordinates ignore transforms and remain deterministic after resizing.
      gsap.set(copy, { autoAlpha: 0, y: 24 });
      gsap.set('.portal-seal', { autoAlpha: 0, scale: 0.94 });
      copy.inert = true;
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: () => `top ${document.querySelector('.site-header')?.getBoundingClientRect().height ?? 80}px`,
          end: () => `+=${window.innerHeight * MORPH.scrollScreens}`,
          pin: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
        onUpdate: () => { copy.inert = timeline.progress() < 0.65; },
      });
      timeline.to('.campus-heading', { autoAlpha: 0, y: -36, duration: 0.27 }, 0.04)
        .to(art, {
          x: () => destination.offsetLeft - art.offsetLeft,
          y: () => destination.offsetTop - destination.offsetHeight / 2 - art.offsetTop,
          scale: () => destination.offsetWidth / art.offsetWidth,
          duration: MORPH.moveDuration, ease: 'power2.inOut',
        }, MORPH.moveStart)
        .to('.portal-seal', { autoAlpha: 0.2, scale: 1, duration: 0.4 }, 0.3)
        .to(copy, { autoAlpha: 1, y: 0, duration: MORPH.textDuration }, MORPH.textStart)
        .to({}, { duration: 0.22 }, 0.78);

      // Fonts affect the shared heading/image width. Refresh once they settle.
      let active = true;
      void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
      return () => {
        active = false;
        delete root.dataset.enhanced;
        copy.inert = false;
      };
    }, stage);
    return () => media.revert();
  }, []);

  return <section className="static-campus campus-scroll-stage" ref={stage} aria-label="From one campus to your digital campus">
    <div className="campus-masthead" aria-hidden="true"><span>THE ARCHITECTURE OF INTELLIGENCE</span><span>DSU / AN INSTITUTION, CONNECTED</span></div>
    <div className="campus-presentation">
      <header className="campus-heading">
        <p className="eyebrow"><span className="eyebrow-square"/>[ INTRODUCING DSU AGENTIC ERP ]</p>
        <h1>ONE CAMPUS.</h1>
        <p className="campus-tagline">INFINITE POSSIBILITIES.</p>
        <nav className="campus-sign-in" aria-label="Campus sign in">
          <Link href="/login?portal=student">Student sign in <span aria-hidden="true">↗</span></Link>
          <Link href="/login?portal=placement-officer">Placement Officer sign in <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>
      <figure className="campus-artwork" ref={artwork}>
        {src ? <IllustrationView src={src}/> : <p className="drawing-unavailable">College illustration unavailable.</p>}
      </figure>
    </div>
    <div className="portal-artwork-target" ref={target} aria-hidden="true"/>
    <div className="portal-seal" aria-hidden="true">
      {/* Official DSU horizontal lockup; show only its circular seal via CSS. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/college/dsu-official-logo.png" alt="" width="2579" height="828"/>
    </div>
    <section className="portal-copy" ref={portal} aria-labelledby="portal-title">
      <p className="portal-eyebrow">[ DSU AGENTIC ERP ]</p>
      <h2 id="portal-title">ACCESS PORTAL.</h2>
      <p className="portal-description">Connect to your digital campus environment.</p>
      <p className="portal-index">02 / PORTAL GATEWAY</p>
      <div className="portal-actions">
        <Link href="/login?portal=student" className="portal-button portal-button-primary">STUDENT SIGN IN</Link>
        <Link href="/login?portal=placement-officer" className="portal-button">PLACEMENT OFFICER SIGN IN</Link>
      </div>
    </section>
    <div className="campus-caption"><p>An intelligent operating system<br/>for the modern university.</p><span>ONE INSTITUTION.<br/>EVERY POSSIBILITY.</span></div>
  </section>;
}
