import type { DrawingSource } from '@/config/illustrationChapters';
import { ArrowDown } from 'lucide-react';
import { IllustrationView } from '@/components/animation/IllustrationView';
export function CampusHeroSection({ src }: { src: DrawingSource }) {
  return <section id="campus" className="journey-chapter campus-hero" data-journey-chapter aria-labelledby="campus-title" tabIndex={-1}>
    <header className="chapter-heading" data-chapter-heading>
      <p className="eyebrow"><span className="eyebrow-square"/>[ INTRODUCING DSU AGENTIC ERP ]</p>
      <h1 id="campus-title">ONE CAMPUS.</h1><p className="sr-only">The complete college exterior from the supplied architectural illustration, including its central dome, towers, and symmetrical wings.</p><p className="campus-subtitle">INFINITE POSSIBILITIES.</p>
    </header>
    <figure className="chapter-static-art"><IllustrationView src={src}/><figcaption>DSU / THE INSTITUTION</figcaption></figure>
    <div className="hero-bottom" data-chapter-details><p>An intelligent operating system<br/>for the modern university.</p><a href="#facade-layer" data-chapter-link="1">EXPLORE THE FIRST LAYER <ArrowDown size={15}/></a><span>ONE INSTITUTION.<br/>EVERY POSSIBILITY.</span></div>
  </section>;
}
