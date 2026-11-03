'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import animationData from './campus-loader.json';
import './campus-loader.css';

/** Full-screen loading view shared by the student and placement portals: the
 * Lottie "searching records" animation, recoloured to the DSU yellow palette,
 * centred until the next page is ready. It renders on <body> so animated page
 * wrappers (which move their contents) never offset it, and it takes its
 * background from the portal it opens over so light and dark themes match. */
export function CampusLoader({ label = 'Loading…' }: { label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [surface, setSurface] = useState<{ background: string; color: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.po-shell, .st-app');
    const style = shell ? getComputedStyle(shell) : null;
    const background = style && style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : '#fafaf8';
    setSurface({ background, color: style?.color ?? '#61645e' });
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!surface || !el) return;
    let cancelled = false;
    let destroy = () => {};
    void import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (cancelled) return;
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animation = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: !still,
        autoplay: !still,
        animationData,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
      });
      if (still) animation.goToAndStop(15, true);
      setReady(true);
      destroy = () => animation.destroy();
    });
    return () => { cancelled = true; destroy(); };
  }, [surface]);

  return (
    <>
      {/* Rendered on the server too, so the status streams before the page. */}
      <span className="campus-loader-status" role="status" aria-live="polite">{label}</span>
      {surface &&
        createPortal(
          <div className="campus-loader" style={surface} aria-hidden="true">
            <div className="campus-loader-anim" ref={host} data-ready={ready || undefined} />
            <p className="campus-loader-label">{label}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
